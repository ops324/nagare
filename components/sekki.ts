/**
 * 節気の彩（二十四節気 → 日本の伝統色）
 * 「星霜」デザインの季節軸。空のグラデーションと流れ線のアクセントを
 * 節気ごとの伝統色で移ろわせる。色値は globals.css の [data-sekki] が持つ。
 * lib には依存させず、名前（lib/koyomi の SolarTerm.name）だけで引く。
 */

export type SekkiKey =
  | 'risshun' | 'usui' | 'keichitsu' | 'shunbun' | 'seimei' | 'kokuu'
  | 'rikka' | 'shouman' | 'boushu' | 'geshi' | 'shousho' | 'taisho'
  | 'risshuu' | 'shosho' | 'hakuro' | 'shuubun' | 'kanro' | 'soukou'
  | 'rittou' | 'shousetsu' | 'taisetsu' | 'touji' | 'shoukan' | 'daikan';

export interface SekkiColor {
  key: SekkiKey;
  name: string; // 節気名（lib/koyomi の SolarTerm.name と一致）
  colorName: string; // 日本の伝統色名
}

const SEKKI_COLORS: SekkiColor[] = [
  { key: 'risshun', name: '立春', colorName: '若草' },
  { key: 'usui', name: '雨水', colorName: '紅梅' },
  { key: 'keichitsu', name: '啓蟄', colorName: '萌黄' },
  { key: 'shunbun', name: '春分', colorName: '桜' },
  { key: 'seimei', name: '清明', colorName: '藤' },
  { key: 'kokuu', name: '穀雨', colorName: '若竹' },
  { key: 'rikka', name: '立夏', colorName: '杜若' },
  { key: 'shouman', name: '小満', colorName: '苗色' },
  { key: 'boushu', name: '芒種', colorName: '露草' },
  { key: 'geshi', name: '夏至', colorName: '瑠璃' },
  { key: 'shousho', name: '小暑', colorName: '浅葱' },
  { key: 'taisho', name: '大暑', colorName: '緋' },
  { key: 'risshuu', name: '立秋', colorName: '桔梗' },
  { key: 'shosho', name: '処暑', colorName: '女郎花' },
  { key: 'hakuro', name: '白露', colorName: '薄花' },
  { key: 'shuubun', name: '秋分', colorName: '竜胆' },
  { key: 'kanro', name: '寒露', colorName: '琥珀' },
  { key: 'soukou', name: '霜降', colorName: '柿' },
  { key: 'rittou', name: '立冬', colorName: '紺青' },
  { key: 'shousetsu', name: '小雪', colorName: '薄縹' },
  { key: 'taisetsu', name: '大雪', colorName: '藍鉄' },
  { key: 'touji', name: '冬至', colorName: '柚子' },
  { key: 'shoukan', name: '小寒', colorName: '千草' },
  { key: 'daikan', name: '大寒', colorName: '瑠璃紺' },
];

const BY_NAME = new Map(SEKKI_COLORS.map((s) => [s.name, s]));

/** 節気名 → 節気の彩。未知の名前は夏至（瑠璃）ではなく小暑を既定にせず、立春に倒す。 */
export function sekkiColorOf(termName: string | undefined): SekkiColor {
  return (termName && BY_NAME.get(termName)) || SEKKI_COLORS[0];
}

export const SEKKI_COLOR_LIST = SEKKI_COLORS;
