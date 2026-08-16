/** 依存を足さずに PNG を RGBA へ展開する最小の実装（測定スクリプト専用）。 */
import zlib from 'node:zlib';

export const PNG = {
  decode(buf) {
    let o = 8;
    let width = 0;
    let height = 0;
    let depth = 8;
    let colorType = 6;
    const idat = [];
    while (o < buf.length) {
      const len = buf.readUInt32BE(o);
      const type = buf.toString('ascii', o + 4, o + 8);
      if (type === 'IHDR') {
        width = buf.readUInt32BE(o + 8);
        height = buf.readUInt32BE(o + 12);
        depth = buf[o + 16];
        colorType = buf[o + 17];
      } else if (type === 'IDAT') {
        idat.push(buf.subarray(o + 8, o + 8 + len));
      } else if (type === 'IEND') break;
      o += 12 + len;
    }
    if (depth !== 8) throw new Error(`bit depth ${depth} は未対応`);
    const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
    const stride = width * ch;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const px = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y++) {
      const ft = raw[y * (stride + 1)];
      const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? px[y * stride + x - ch] : 0;
        const b = y > 0 ? px[(y - 1) * stride + x] : 0;
        const c = y > 0 && x >= ch ? px[(y - 1) * stride + x - ch] : 0;
        let v = line[x];
        if (ft === 1) v += a;
        else if (ft === 2) v += b;
        else if (ft === 3) v += (a + b) >> 1;
        else if (ft === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        px[y * stride + x] = v & 255;
      }
    }
    // 呼び出し側は常に RGBA を前提にする
    if (ch === 4) return { width, height, data: px };
    const out = Buffer.alloc(width * height * 4, 255);
    for (let i = 0, j = 0; i < px.length; i += ch, j += 4) {
      out[j] = px[i];
      out[j + 1] = ch === 1 ? px[i] : px[i + 1];
      out[j + 2] = ch === 1 ? px[i] : px[i + 2];
    }
    return { width, height, data: out };
  },
};
