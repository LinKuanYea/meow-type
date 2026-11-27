// 最小的 MP4 封裝：把 WebCodecs VideoEncoder 產生的 H.264（AVCC 格式）畫格包成一個 .mp4 檔（只有影像、沒有聲音）。
// 結構：ftyp → mdat（所有畫格）→ moov（索引）。IG、手機相簿、電腦播放器都能播。

const enc = new TextEncoder();
function box(type, ...parts) {
  const body = parts.flat(Infinity);
  const size = 8 + body.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(size), dv = new DataView(out.buffer);
  dv.setUint32(0, size); out.set(enc.encode(type), 4);
  let o = 8; for (const p of body) { out.set(p, o); o += p.length; }
  return out;
}
const u8 = (...a) => new Uint8Array(a);
const u16 = (v) => u8((v >> 8) & 255, v & 255);
const u32 = (v) => u8((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
const zeros = (n) => new Uint8Array(n);
const fullBox = (type, ver, flags, ...parts) => box(type, u8(ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255), ...parts);
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32);

/**
 * chunks：[{ data: Uint8Array, key: boolean }]（依順序，每格一個），fps：每秒幾格
 * avcC：VideoEncoder 第一個輸出的 metadata.decoderConfig.description
 */
export function muxMp4({ chunks, width, height, fps, avcC }) {
  const n = chunks.length, ms = Math.round((n / fps) * 1000);
  const ftyp = box("ftyp", enc.encode("isom"), u32(512), enc.encode("isomiso2avc1mp41"));
  const dataLen = chunks.reduce((a, c) => a + c.data.length, 0);
  const mdatHead = new Uint8Array(8); new DataView(mdatHead.buffer).setUint32(0, 8 + dataLen); mdatHead.set(enc.encode("mdat"), 4);
  const dataStart = ftyp.length + 8;

  const avc1 = box("avc1", zeros(6), u16(1), zeros(16), u16(width), u16(height), u32(0x00480000), u32(0x00480000), zeros(4), u16(1), zeros(32), u16(0x18), u16(0xffff),
    box("avcC", new Uint8Array(avcC)));
  const stbl = box("stbl",
    fullBox("stsd", 0, 0, u32(1), avc1),
    fullBox("stts", 0, 0, u32(1), u32(n), u32(1)),
    fullBox("stss", 0, 0, u32(chunks.filter((c) => c.key).length), chunks.map((c, i) => (c.key ? u32(i + 1) : [])).flat()),
    fullBox("stsc", 0, 0, u32(1), u32(1), u32(n), u32(1)),
    fullBox("stsz", 0, 0, u32(0), u32(n), chunks.map((c) => u32(c.data.length))),
    fullBox("stco", 0, 0, u32(1), u32(dataStart)));
  const minf = box("minf", fullBox("vmhd", 0, 1, zeros(8)), box("dinf", fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1))), stbl);
  const mdia = box("mdia",
    fullBox("mdhd", 0, 0, u32(0), u32(0), u32(fps), u32(n), u16(0x55c4), u16(0)),
    fullBox("hdlr", 0, 0, u32(0), enc.encode("vide"), zeros(12), enc.encode("VideoHandler\0")),
    minf);
  const trak = box("trak",
    fullBox("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(ms), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16)),
    mdia);
  const moov = box("moov",
    fullBox("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(ms), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(2)),
    trak);
  return new Blob([ftyp, mdatHead, ...chunks.map((c) => c.data), moov], { type: "video/mp4" });
}
