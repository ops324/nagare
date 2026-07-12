/**
 * アプリ全体で共有するドメイン型
 */

export type Gender = '男' | '女' | '未回答';

/** ユーザーの生年月日プロフィール（入力モデル） */
export interface BirthProfile {
  /** 生年月日 'YYYY-MM-DD'（必須） */
  date: string;
  /** 出生時刻 'HH:mm'（任意：あると月の位置・命式の精度が上がる） */
  time?: string;
  /** 出生地（任意：ハウス・アセンダント用。Phase 3） */
  place?: { lat: number; lng: number; name: string };
  /** 性別（任意：厄年の判定に使用） */
  gender?: Gender;
}

/** 流れの項目の重み。UI の並び順・強調に使う。 */
export type Severity = 'high' | 'medium' | 'low';
export type Tone = 'good' | 'caution' | 'neutral';

/** 「今日の流れ」「大きな流れ」を構成する 1 項目 */
export interface FlowItem {
  /** 体系タグ（天体 / 暦 / 九星 / 運気 など） */
  system: string;
  title: string;
  /** 平易な説明（一般ユーザー向け） */
  description: string;
  tone: Tone;
  severity: Severity;
  /** アイコン絵文字（任意） */
  emoji?: string;
}

/** マクロ（大きな流れ）のタイムライン上の 1 イベント */
export interface TimelineEvent {
  /** 西暦（年単位のイベント） */
  year: number;
  label: string;
  description: string;
  kind: 'nenun' | 'yakudoshi' | 'happou' | 'transit' | 'now';
  tone: Tone;
}
