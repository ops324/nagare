# 流れ（Nagare）技術仕様書

> **目的**：本書は、今後の改修・改善で**意図しない箇所へ影響が波及するのを防ぐ**ための技術リファレンスです。
> 特に「**§4 依存関係・影響範囲**」「**§5 不変条件（検証済み基準値）**」「**§12 改修時チェックリスト**」を、コード変更前に必ず確認してください。
> 実装と乖離したら本書を更新すること（本書はコードと同じリポジトリで管理する生きたドキュメント）。

最終更新: 2026-07-17 / 対象: `main`（PR #1〜#25 反映済み。「星霜」リデザイン＝実時刻連動の空4状態・節気の彩・流れ線・星図、操作色は金基調を継承）

---

## 1. 概要

天体・暦・命術で「今の流れ」を読む一般ユーザー向け Web アプリ。生年月日（時刻・性別は任意）だけで、**今日の流れ（ミクロ）**と**大きな流れ（マクロ＝人生周期）**の2軸を提示する。

- 対象: 一般ユーザー（専門用語には必ず平易な説明を添える）
- 方針: 天体は精密天文暦で計算、暦注・命術は決定論的アルゴリズム＋**参照値テストで裏取り**
- 正確性が信頼の生命線。**各占術は公開値・実例で検証済み**（§5）

## 2. 全体アーキテクチャ

- **ドメイン層 `lib/`**（純TypeScript・UI非依存・テスト対象）と **UI層 `app/` `components/`** を厳密に分離。
- **クライアント計算のみ**（バックエンド無し）。プロフィールは `localStorage`。
- 全時刻計算は **JST（UTC+9・サマータイム無し）固定**。天体計算は astronomy-engine（UTCインスタント）→ `lib/time.ts` が JST 暦日へ変換。
- 占術の**方式・出典は `lib/provenance.ts` に集約**（`method`/`source`/`version`）。流派・文言の差し替えを局所化。

技術スタック: Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS v4 / `astronomy-engine`(MIT) / `date-fns` / Vitest。デプロイ: Vercel（GitHub連携・main→本番自動、PR→プレビュー）。リポジトリ: `ops324/nagare`。

## 3. ファイル構成（`lib/`）

| 分類 | ファイル | 責務 |
|---|---|---|
| 基盤 | `time.ts` | JST変換・ユリウス通日・角度ユーティリティ。**全計算の土台** |
| 基盤 | `constants.ts` | 名称テーブル（干支・星座・九星・六曜・月相） |
| 基盤 | `types.ts` | `BirthProfile` ほか共有型 |
| 基盤 | `provenance.ts` | 方式/出典/版メタ |
| 天体 | `astro.ts` | 太陽星座・月相・**逆行(地心)**・潮汐 |
| 天体 | `seiyo.ts` | 日月食・ボイドタイム・スーパームーン |
| 暦注 | `koyomi.ts` | 二十四節気・干支・旧暦・六曜・選日・**二十八宿** |
| 命術 | `kyusei.ts` | 九星（本命星・回座・八方塞がり） |
| 命術 | `houi.ts` | 九星の年盤・吉方位・凶方位 |
| 命術 | `shichu.ts` | 四柱推命の命式・天中殺 |
| 命術 | `daiun.ts` | 四柱推命の大運（10年区切り） |
| 命術 | `sukuyo.ts` | 宿曜の本命宿（27宿） |
| 命術 | `sukuyo-sanku.ts` | 宿曜の三九の秘法（相性） |
| 命術 | `rokusei.ts` | 六星占術（星人±・運気・大殺界） |
| 運気 | `cycles.ts` | 厄年・バイオリズム |
| 運気 | `transits.ts` | 外惑星の回帰・年天中殺の巡り |
| 統合 | `profile.ts` | 生年月日→個人の固定情報 |
| 統合 | `flow.ts` | **流れ統合エンジン**（今日/大きな流れ） |
| 表示 | `copy.ts` | 鑑定解説文＋開運文言（`ACTION_COPY` 15種／`BAND_COPY` 5種・監修ドラフト v1） |
| 表示 | `format.ts` | 和暦・曜日・日付整形（`jstYmd`/`jstMonthDay`/`jstYearMonth` 等） |
| 表示 | `useProfile.ts` | localStorage フック（'use client'） |
| — | `index.ts` | 公開APIバレル |

UI: `app/layout.tsx`（フォント・テーマカラー）、`app/page.tsx`（オンボーディング/ダッシュボード分岐）、`components/`（Dashboard・NavBar・**Hitokoto（ひとこと）・LuckyActions（開運アクション）・lucky.ts（今日の色の導出）**・各カード・SVG図・Jiten事典・Aisho相性）。

## 4. 依存関係・影響範囲マップ（改修前に必読）

**「基盤ほど広く波及する」。以下を変えると右側すべてに影響する。**

| 変更対象 | 影響が及ぶ先（＝要再検証） |
|---|---|
| `time.ts`（JST/JDN/角度） | **ほぼ全モジュール**。日付・干支・旧暦・天体すべて |
| `koyomi.dayKanshiIndex`（日干支エポック=2026-01-01=乙亥) | 干支・**選日**・四柱推命(日柱/天中殺)・**六星占術(星人/運気)**・**今日の色（UI・日干の五行）** |
| `koyomi.kyureki`（旧暦） | **六曜**・**宿曜の本命宿**(`sukuyo.shukuOf`) |
| `koyomi.setsugetsuBranch`（節月） | **選日**(一粒万倍/天赦)・四柱推命(月柱) |
| `koyomi.solarTerm*`（節気） | 節気表示・`kyusei`(立春境界)・`houi`・`daiun`(節入り)・`seiyo`間接 |
| `astro.geoEclipticLongitude` | **惑星逆行**・`seiyo.voidOfCourse`。※日心黄経へ戻すと逆行バグ再発（§11） |
| `kyusei.honmeiNumberForYear` | 本命星・回座・八方塞がり・`houi`・`flow`マクロ |
| `shichu.meishiki` | 命式・天中殺・`daiun`(月柱/日主) |
| `rokusei.unmeisei`/`runki*` | 六星カード・`flow`マクロ(大殺界) |
| `profile.buildProfile` | 全UI（Dashboard がこれを起点に描画） |
| `flow.ts` | 今日/大きな流れの全表示。**多数のドメインに依存**（下記） |

`flow.computeTodayFlow` の依存: astro（月相/潮汐/逆行/星座）・koyomi（節気/六曜/選日）・seiyo（食/ボイド/スーパームーン）・cycles（厄年/バイオ）・kyusei（八方塞がり）。
`flow.computeMacroFlow` の依存: kyusei（回座）・cycles（厄年）・transits（回帰/天中殺年）・rokusei（運気/大殺界）。

> **原則**：ドメイン計算は「入力（Date/BirthProfile）→ 純粋関数 → 出力」。UI からドメインの内部実装に踏み込まない。新機能は既存関数を再利用し、基盤の署名（関数シグネチャ）を安易に変えない。

## 5. 不変条件（検証済み基準値）— これらは壊してはならない

改修後、以下が変わったら**バグの疑い**。すべて Vitest（`npm test`・165件）で固定済み。

| 項目 | 基準値（出典） |
|---|---|
| 日干支エポック | **2026-01-01(JST)=乙亥**（複数万年暦。2026-03-05=戊寅と63日差=+3で整合） |
| 二十四節気2026 | 立春2/4・春分3/20・夏至6/21・秋分9/23・冬至12/22・大寒1/20・啓蟄3/5 ほか |
| 六曜 | 2026-01-01大安・02-04仏滅・02-17先勝・03-05大安（(旧暦月+日)mod6） |
| 旧暦 | 2026-01-01=旧2025/11/13・2026-02-17=旧2026/1/1（旧正月） |
| 選日・天赦日2026 | 3/5・5/4・5/20・7/19・10/1・12/16 |
| 本命星（九星） | 1994六白・1995五黄・2000九紫・2025二黒・2026一白（立春境界） |
| 吉方位2026 | 五黄殺=南・暗剣殺=北・歳破=北（午年）／2025 五黄殺=北東・歳破=北西 |
| 命式（四柱推命） | 1987-06-10 01:00 → 丁卯/丙午/庚寅/丁丑・午未天中殺 |
| 大運 | 1994-07-05男 → 順行・立運0年8ヶ月・初運辛未／女 → 逆行・初運己巳 |
| 日月食2026 | 2/17金環日食・3/3皆既月食・8/12皆既日食・8/28部分月食 |
| 二十八宿 | 基準 **2026-07-23=角宿**（角起点28日周期。7/1箕・7/5虚・7/7室・7/31牛） |
| 宿曜本命宿 | 1986-10-19（旧9/16）=畢宿／旧正月=室宿（旧暦＋朔日宿方式） |
| 三九の秘法 | 本命宿=昴：栄={畢近,女中,軫遠}・親={胃近,張中,箕遠}（近中遠=最小円距離） |
| 六星占術 運気2026 | 6sei.net公式の**全12星人±と一致**（水+達成/火+停止/火−陰影/天王−減退＝大殺界） |
| バイオリズム | 誕生日当日=3リズムとも0（周期23/28/33） |
| 水星逆行の留2026 | 順行転換 **2026-07-24**ごろ（他 3/21・11/14。地心±12h法で留を前方探索） |

## 6. モジュール別仕様（要点）

各モジュール共通の見方：**方式／基準・エポック／出典(provenance)／変更時の注意**。

### time.ts（基盤）
- JST=UTC+9固定。`toJstParts`/`jstToInstant`/`jstNoon`/`addDays`/`julianDayNumber`/`jstJdn`/`jstDayDiff`/`norm360`/`angleDelta`。
- 干支・六曜・旧暦・選日は**JST暦日**で判定。天体（astronomy-engine）はUTCで計算し、ここでJSTへ橋渡し。
- **注意**：`julianDayNumber`/`jstJdn` は「日数の周期」（干支・28宿）の土台。式を変えると全周期がずれる。

### astro.ts（天体）
- `sunSign`（トロピカル、太陽視黄経÷30）、`moonState`（月相8区分・月齢・輝面・月星座）、`tide`（月相から大潮/小潮）。
- **`geoEclipticLongitude` = `Ecliptic(GeoVector(body,date,true))`（地心・その日の真黄道）**。`isRetrograde` は±12hの地心視黄経の減少で判定。`SunPosition.elon`/`EclipticGeoMoon.lon` と同じ of-date 系で整合。
- **`retrogradeEnd(body,now)`/`mercuryRetrogradeEnd(now)`**：逆行中の天体が順行に戻る（留）時刻を前方探索（12h刻みで挟み→二分探索）。`planetRetrogrades` は逆行中の惑星に `endsAt`（順行は `null`）を持つ。※逆行中前提で呼ぶ。表示用の派生値で占術値には非関与。
- **重大注意**：astronomy-engine の `EclipticLongitude` は**日心**黄経で、逆行・アスペクトに使うと誤り（常に順行）。§11の既知バグを再発させないこと。

### seiyo.ts（西洋拡張）
- `nextSolarEclipse`/`nextLunarEclipse`（種別＝皆既/金環/部分/半影）、`nextSupermoon`（次の満月≤36万km）、`voidOfCourse`（月が次の星座へ移るまで主要アスペクト0/60/90/120/180°を結ばない時間帯）。
- 月/惑星とも `astro.geoEclipticLongitude`（of-date地心）で統一。
- **注意**：ボイドは∼2.7日窓を12分刻みでサンプルし最後のアスペクトを検出。窓幅・刻みを変えると結果が微変。

### koyomi.ts（暦注・最重要）
- **二十四節気**：太陽視黄経が15°倍に達する時刻を探索。`solarTermsInYear`/`solarTermAround`。
- **日干支**：`dayKanshiIndex(instant)=mod60(jstJdn−jstJdn(2026-01-01)+11)`。基準=乙亥(11)。
- **旧暦 `kyureki`**：新月列＋中気で朔望月・閏月を構成。**朔日は「朔を含むJST暦日」を1日目**（瞬間比較でなく暦日比較。旧正月の境界対策）。
- **六曜**：`(旧暦月+旧暦日)mod6`（0大安…5仏滅）。
- **選日 `senjitsu`**：日干支＋節月の規則表（一粒万倍/天赦/甲子/己巳/寅/巳）。節月は**JST 23:59の黄経**で判定（節入り日を新節月に含める）。
- **二十八宿 `nijuhasshuku`**：角起点28配列、基準2026-07-23=角、`mod28(jstJdn−基準)`。※これは暦の日替わり（27宿の本命宿とは別体系）。
- 出典: `PROVENANCE.nijuhasshuku`。

### kyusei.ts / houi.ts（九星）
- 本命星番号 = `11 − 数字根(立春年)`（>9は−9）。立春境界は `risshunInstant`/`risshunYear`。
- `nenun`：中宮星=本命星番号(年)。本命星の回座宮 base=`mod9to1(h−(c−5))`。base=5→八方塞がり。
- `houi`：年盤で各方位の九星、凶方（五黄殺=五黄の方位/暗剣殺=その対/歳破=年支の対/本命殺=本命星の方位/本命的殺=その対）、吉方（本命星と相生・比和かつ凶方・五黄でない）。
- **注意**：立春の年境界。方位の対（OPPOSITE）と地支→8方位表は houi の要。

### shichu.ts / daiun.ts（四柱推命）
- `meishiki`：年柱(立春)・月柱(節入り+五虎遁)・日柱(日干支)・時柱(五鼠遁)。`tenchusatsuOf`(日柱の空亡6種)。
- `daiun`：順逆＝年干陰陽×性別（陽男/陰女=順行）。立運＝節入りまでの日数÷3（余り×4ヶ月）。月柱の隣から±に六十干支。
- **注意**：経度・均時差補正なし（JST時計時刻）。子刻の日跨ぎは正子基準（§11）。

### sukuyo.ts / sukuyo-sanku.ts（宿曜）
- `honmeishuku`（27宿）：`kyureki`＋朔日宿表（各旧暦月の1日の宿）から旧暦日数分進める。起点=昴。
- `sanku`（三九）：位置差 d で 命(0)/業(9)/胎(18)、各9宿グループ内 index1..8 に栄衰安危成壊友親。**近中遠=最小円距離** `min(d,27−d)` の順。文言は `copy.SANKU_DESC`。
- **注意**：本命宿=27宿（`kyureki`依存）。日替わり暦は28宿（別）。両者を混同しない。

### rokusei.ts（六星占術）
- `unmeisei`：星人=日柱の空亡ペア（土=戌亥…水=子丑）＝`dayKanshiIndex`由来。±=暦年の十二支陰陽。
- 運気: `off± = (空亡第1支 +2/+3) mod12`、`運気 = CYCLE[(年支−off)mod12]`。大殺界=陰影/停止/減退。
- 出典: `PROVENANCE.rokusei`（6sei.net公式）。**式は2026公式全12星人±で検証済み**（§5）。年支は立春基準。

### cycles.ts / transits.ts（運気サイクル）
- 厄年: 数え年×性別の表（前厄/本厄/後厄/大厄）。バイオリズム: 周期23/28/33の正弦。
- transits: 外惑星の**日心回帰**でサターン/ジュピターリターン年、`tenchusatsuYears`（日柱空亡の年支に当たる年）。

### profile.ts / flow.ts（統合）
- `buildProfile(BirthProfile)`→ 出生インスタント（時刻無しは正午）・太陽星座・本命星・干支・日柱。
- `computeTodayFlow`→ フロースコア(0-100)＋ハイライト/注意＋各データ。`computeMacroFlow`→ 数年テーマ・回座・タイムライン・次の転機・運気/大殺界・回帰・天中殺年。`currentPhasePeriod`＝今年の運気の期間（立春(currentYear)〜次の立春(currentYear+1)）の表示用派生値（占術値には非関与）。UI「次の転機」は `year` 昇順で表示。
- **今日タブの期間表示**（#18 の年運パターンの横展開・表示用派生値）：冒頭に**二十四節気の期間**（`data.term.current.instant`〜`next.instant` を `jstMonthDay` で整形）を専用ラインで表示。時限イベントは終了日を文言に添える＝水星逆行の留（`mercuryRetrogradeEnd`）・ボイド終了（`voidOfCourse.signChange`）・スーパームーン満月日（`nextSupermoon.fullMoon`）。いずれも既存インスタント／`isRetrograde` からの導出で §5 基準値には非抵触。
- **注意**：スコアの重み付けは意図的なヒューリスティック。表示文言は `copy.ts`／各ドメインの note。
- **開運レイヤー**（今日の色・ひとこと・開運アクション・祝祭・ストリーク）は **UI 層の表示派生**（§7）。`lucky.ts` が `dayKanshi().stem` を、`Hitokoto`/`LuckyActions` が `computeTodayFlow` の出力と `todayShuku` を読むだけで、スコア・占術値には非関与（lib 追加は `copy.ts`/`provenance.ts` の文言・メタのみ）。

## 7. UI構成（5タブ）

`app/page.tsx`：`useProfile` で localStorage 読込。未マウント→スプラッシュ、プロフィール無→オンボーディング、有→`Dashboard`（ハイドレーション不一致回避のゲート）。

| タブ | 使用ドメイン |
|---|---|
| 今日 | flow.today（月相・六曜・節気・選日・食/ボイド/スーパームーン・逆行・バイオ・厄年・八方塞がり） |
| 大きな流れ | flow.macro（回座タイムライン・天中殺/厄年/八方塞がり/大殺界・回帰） |
| 生まれ | profile・命式・宿曜本命宿・相性(Aisho)・六星(運気)・九星盤(吉方位) |
| 暦 | 二十八宿・月カレンダー（六曜/節気/選日） |
| 事典 | `copy.ts` の全一覧（星座/九星/27宿/三九/12運気/注意期間） |

図はすべて自作SVG（フローメーター・月相・九星盤・タイムライン・バイオリズム）。

**デザインは「星霜（せいそう）」＝ 今日の空 × 節気の彩 × 一本の流れ**（M3 トークン体系を継承・`app/globals.css` に集約）。基準イメージ＝「実時刻の空の上に金のゲージ・明朝の数字・常に金のラベル」（運が低い日も美しい）：
- **空（実時刻連動テーマ）**: `html[data-sky="dawn|day|dusk|night"]` の4状態で全トークンが切り替わる。判定は東京基準の太陽高度（`components/skyState.ts`・±6°が薄明帯）。`components/SkyField.tsx` が分単位で再評価し、`layout.tsx` の no-FOUC インラインスクリプトが初回描画前に時刻バンドで仮決めする。**この起動スクリプトは `div[hidden]` の `dangerouslySetInnerHTML` で HTML 文字列として注入する**（React に `<script>` 要素として描画させると React 19 が「Scripts inside React components are never executed when rendering on the client」の Console Error を出すため。SSR HTML には生の script として載り、パーサーが本文描画前に実行する点は同じ）。`html` は `suppressHydrationWarning`（スクリプトが `data-sky` を書くため）。`:root[data-theme]` の上書きは dark→night / light→day に固定（JS 側で解決・CSS に theme ブロックは無い）。夜=夜紺の星空（既定・`:root`）、昼=生成りの光、暁/宵は各々の差分ブロック。状態遷移は `@property` 登録済みトークン（`--bg-hi/--bg-lo/--stars`）の transition でクロスフェード（reduced-motion では無効）。`color-scheme` は状態駆動（暁/昼=light・宵/夜=dark）。
- **星図（SkyField）**: 背景固定層（`body::before` のグラデ＝`--bg-hi/--bg-lo` の上）に、決定論的配置の星（`--stars` で濃度制御）・実際の月相（`MoonGlyph`・宵/夜のみ出現）・逆行惑星のマーク（惑星記号＋名）をSVG/CSSで描く。スクロール視差は rAF + transform のみ。
- **流れ線（FlowLine）**: タブ全高を節気色→金→節気色のグラデの「光の川」が緩やかに蛇行して降りる。**3層構成**＝淡い川筋（`feGaussianBlur` のぼかし・常に全描画で流路を予感させる）／帯／輝く芯。帯と芯だけがスクロールに合わせ `stroke-dashoffset` で描かれる（今日タブは振幅=スコア連動・タブごとに seed 固定・蛇行間隔 400–580px・出だしは振幅を抑制・両端はグラデでフェード・reduced-motion では常に全描画）。**今日タブでは `.flowmeter` の下端を実測して線をその下から開始**（ゲージに被らない）。カードは半透明（86%）なので線が背後をかすかに通る。
- **節気の彩**: 二十四節気→日本の伝統色（`components/sekki.ts` が名前→キー、`html[data-sekki]`＋`--sekki`/`--sekki-l/-d` トークン24組）。セクション見出しの点・ゲージ外周の残光・流れ線・暦の節気表示に乗る。五行の「今日の色」（`data-lucky`）とは役割分離（lucky=開運レイヤー専用）。
- **カラー**: primary＝**金**（金箔・light `#715c0f`/dark `#dbc66f`）。tertiary は primary と同値の同系ゴールド（`--accent` が primary の別名、`--accent-soft` は一段ずらしたトーン＝dark `--gold-300`／light `--gold-500`。生成り地では `--gold-300` が 4.2:1 で AA 未達のため、ライトは暗い側へ振る）。good/caution＝M3トーンの吉/凶（caution が M3 error 役を兼務）。`--secondary-container` はセグメント／ナビの活性ピルとして**面で出る**ため生成り寄りの温色（light `#e7e0c8`/dark `#4a4735`）。`--secondary` 自体は銀青のまま＝`--silver` の別名で、細い線・小さな字（`Biorhythm.tsx` の知性、`LifeTimeline.tsx` の中立トーン、`.mk-kanoene`）にのみ乗る。サーフェスは `--surface-container-*` 階層（生成り/夜紺トーン）。カードは3層＝hero（`.card`＋`--elev-1`）／filled（`.card-filled`・影なし）／outlined。
- **曜日色**: 土＝青（light `#3a5c9e`/dark `#8aa6d9`）、日＝赤（light `#9c4331`/dark `#ffb4a3`）は暦の慣習であって操作色ではないため、`--weekday-sat`/`--weekday-sun` として**テーマから独立**させる（`--primary`/`--caution` を参照しない。参照すると操作色の変更で土曜が追随して慣習が壊れる）。アプリ内で青が残る唯一の箇所。
- **開運レイヤー**: ①「今日の色」＝日干の五行→伝統色（`components/lucky.ts`、`html[data-lucky]`＋`--lucky*` トークン、方式は `PROVENANCE.luckyColor`）。適用はひとことカードと開運アクションの2ゾーンのみ ②ひとこと（`components/Hitokoto.tsx`＝挨拶＋トップシグナル＋`BAND_COPY` のテンプレ合成・非LLM、ストリーク・命の日バッジ） ③開運アクション（`components/LuckyActions.tsx`＝シグナル優先度で `ACTION_COPY` から最大3件・朗報ファースト） ④祝祭モーション（スプリングトークン `--spring-*`、天赦日の金の粒バースト＝日1回ガード＋reduced-motion 抑止、大安の脈動、score≥78 の金ブルーム、スコア数字は rAF カウントアップ。ゲージは弧・光暈・ラベルまで常に金の聖域。**光暈は真円の光源**＝`aspect-ratio 1:1`＋`border-radius 50%`＋`closest-side` の多段減衰（金の芯→暖色→節気色の裾→完全透明・囲み矩形の端に達する前に必ず消えるため境目が出ない）で、8秒周期の呼吸つき。外周には節気色の残光弧）。
- **ナビ**: 画面下部の浮遊ピル型ナビゲーションバー（`components/NavBar.tsx`・5項目・アイコン自作SVG・`nav`＋`aria-current` セマンティクス・半透明＋blur・活性ピルのスプリングモーフ）。ヘッダーも半透明 blur で空に溶ける。
- **タイポグラフィ**: 本文/UI＝Noto Sans JP（400/500/600/700）、ワードマーク・大きな漢字値・数字（スコア/日付/暦）＝Shippori Mincho（和の要所）。**文字サイズ下限 11px**（暦セル内のみ 10px 例外）、text-faint は装飾専用。
- **旧変数互換**: `--accent` `--gold-*` `--border-*` `--text-*` `--silver` 等は M3 トークンへの別名として維持（SVGコンポーネントが参照）。

今日タブの構成順：ゲージ → ひとこと → 開運アクション → 今日の兆し → 月と潮 → バイオリズム → 天体の便り → 気をつけたいこと（節気カードは暦タブ先頭へ移動・生まれチップは生まれタブのみ）。

## 8. データモデル・永続化

```ts
BirthProfile { date:'YYYY-MM-DD'(必須); time?:'HH:mm'; place?:{lat,lng,name}; gender?:'男'|'女'|'未回答' }
```
- localStorage キー `nagare.profile.v1`（`useProfile`）。サーバ送信なし。
- 付随キー: `nagare.visit.v1`（連続観測日数 `{ last, lastNum, streak }`・JST暦日基準）、`nagare.fete.v1`（祝祭演出の日次ガード `'YYYY-MM-DD:tensha'`）。いずれも消えても占術結果には無影響。
- 時刻無し＝正午で代表。性別無し＝大運の向きが定まらない旨をUIで注記。

## 9. 品質保証（テスト対応表）

`npm test`（Vitest・165件）。**参照値テスト＝§5の不変条件を固定**。改修時は必ず緑を維持。

| テスト | 守っている対象 |
|---|---|
| koyomi.test | 節気・日干支・旧暦・六曜・選日 |
| kyusei.test | 本命星・立春・回座・八方塞がり |
| houi.test | 五黄殺/歳破・吉方位 |
| shichu.test | 命式4柱・天中殺・時支 |
| daiun.test | 大運（順逆・立運・初運） |
| sukuyo-rokusei.test | 本命宿・星人 |
| sukuyo-sanku.test | 三九（昴例・全27宿） |
| rokusei-unki.test | 12星人±の運気・大殺界 |
| nijuhasshuku.test | 二十八宿（掲載日一致） |
| seiyo.test | 日月食・スーパームーン・ボイド・月黄経 |
| transits.test | 回帰・年天中殺 |
| astro.test | 太陽星座・月・**水星逆行の妥当性(年40〜90日)**・**逆行の留日(2026-07-24)** |
| cycles-flow.test | 数え年・厄年・バイオ・profile・今日/大きな流れ |

その他ゲート: `tsc --noEmit`（型）、`eslint`（react-hooks の effect 内同期 setState 禁止等。意図的な localStorage マウントゲートは理由付き disable コメント＝`useProfile` 方式）、`next build`（静的プリレンダー）、pre-push フック＝`npm test` 自動実行、GitHub Actions CI（verify）、Claude Preview 実機確認。

## 10. 採用した規約・前提

- タイムゾーン: **JST固定**。年境界: 命術は**立春**（九星・四柱・六星の運気）、厄年は**数え年（元日基準）**、六星の±は**暦年**の十二支。
- エポック: 日干支=2026-01-01=乙亥、二十八宿=2026-07-23=角。
- 天体: **of-date 地心**の視黄経（`astro.geoEclipticLongitude`）で統一。
- 流派: 六星=6sei.net公式／宿曜本命宿=27宿旧暦表(起点昴)／三九=標準宿曜経(近中遠=最小円距離)／二十八宿=角起点。すべて `provenance` で明示。

## 11. 既知の制約・保留（改修の落とし穴）

- **逆行は必ず地心黄経で**。`EclipticLongitude`(日心)へ戻すと逆行が常に順行になる（過去の実バグ）。
- 四柱推命に**経度・均時差補正なし**（JST時計時刻）。子刻の日跨ぎは正子基準。
- 宿曜相性の**解説文の言い回し**は監修ドラフト（`copy.SANKU_DESC`）。判定ロジックは検証済み。文言差替は `provenance.version` を更新。
- **開運アクション・ひとこと帯句・今日の色の解説も監修ドラフト**（`copy.ACTION_COPY`/`BAND_COPY`・事典「今日の色」）。文言・方式の差替は `PROVENANCE.luckyColor` の version と本書を更新。
- ボイド/スーパームーンの閾値・近似は簡易（実務では流派差あり）。
- **日盤吉方位・吉時間帯（時辰の吉凶）は未実装（Phase B）**。`houi()` は年盤のみ。着手前に流派・方式の監修が必要で、実装時は新 lib 関数＋公開暦との照合テストが必須。
- 天赦日の金の粒バーストは日次ガード（`nagare.fete.v1`）のため同日2回は出ない。`prefers-reduced-motion` 時は静的表示のみ。
- 出生時刻/出生地の高精度ホロスコープ（アセンダント・ハウス）は未実装（将来）。

## 12. 改修時チェックリスト（意図しない影響を防ぐ）

1. **影響範囲を§4で確認**。基盤（time/koyomi/astro/profile/flow）ほど広く波及する。
2. `git checkout -b feat/...` で**ブランチを切る**（main直接編集しない）。
3. 変更したドメイン関数に**参照値テストを追加/更新**（§5の値を壊さない）。
4. `npm test`（165件）→ `tsc --noEmit` → `eslint .` → `npm run build` を**すべて緑**に。
5. 表示に関わるなら **Claude Preview で実機確認**（空4状態＝`data-sky` を dawn/day/dusk/night に強制・スマホ 320/375px・今日の色は `data-lucky` 5色）。**レイアウトが突然崩れたら（例：星図が固定されず月が左上に落ちる）まず dev サーバーの stale CSS を疑う**：ブランチ切替や `npm run build` を挟むと Turbopack の CSS 再コンパイルが固まり、旧 CSS を配信し続けることがある。配信中の CSS を `curl` して `data-sky`／`skyfield` が含まれるかで判定し（無ければ stale）、`.next/dev` を消して dev サーバーを再起動する。ソースや本番ビルドは無傷。
6. **デザイントークンを変えたら同期を確認**：空4状態の整合＝明るい地の共通ブロック（`[data-sky="day"], [data-sky="dawn"]`）と暁/宵の差分ブロックで `--primary`/`--accent-soft`/`--weekday-*` を揃える・`viewport.themeColor`（layout.tsx）・`--bg-hi/--bg-lo`（`@property` 登録済み＝構文は `<color>` 固定）。金の作法（操作色は金・caution に金を載せない・明るい地では金を暗い側のトーンへ振って AA 4.5:1 を確保）を崩さない。`--weekday-sat/sun` は暦の慣習用で操作色から独立（§7）。節気色（`--sekki-l/-d` 24組）は装飾アクセント専用＝本文文字には乗せない。金を別の色へ振り直す場合は**同系の金が重なる 2 グラフ**（`Biorhythm.tsx` の からだ/知性、`LifeTimeline.tsx` の帯とノード）で線が判別できるか必ず確認する。
7. 占術の方式・流派・文言を変えたら **`provenance` の version を更新**し、本書§5/§10も更新。
8. PR作成→検証結果を本文に記載→**squashマージ→Vercel自動デプロイ**。
9. 既存の署名（公開API）を変える場合は、`index.ts` バレルと全呼び出し元を横断確認。

## 13. 用語集（抜粋）

日干支/干支＝十干十二支の60周期。節月＝節気で区切る月（立春=寅月）。回座＝九星が年盤で巡る位置。八方塞がり＝本命星が中宮に入る年。空亡/天中殺＝日柱の旬で余る2支。運命星/星人＝六星占術の分類。大殺界＝六星の運気の陰影・停止・減退。本命宿＝生時の月が宿る27宿。三九の秘法＝宿曜の相性。二十八宿＝暦の日替わりの宿（牛宿を含む28）。今日の色＝日干の五行（甲乙木・丙丁火・戊己土・庚辛金・壬癸水）を日本の伝統色（萌黄・紅・琥珀・金箔・浅葱）に写した日替わりアクセント。命の日＝今日の27宿が本命宿と重なる個人の吉日（`todayShuku().isMeinichi`）。星霜＝本アプリのデザイン言語（今日の空×節気の彩×一本の流れ）。空の状態＝実時刻の太陽高度による dawn/day/dusk/night の4状態（`data-sky`）。節気の彩＝二十四節気を日本の伝統色に写した季節アクセント（`data-sekki`・`--sekki`）。流れ線＝タブ全高を降りる3層（川筋・帯・芯）の光の川（`FlowLine`・帯と芯はスクロールで描画）。星図＝背景の星・月相・逆行マークの層（`SkyField`）。

---

*本書はコードと同じリポジトリ（`docs/SPEC.md`）で管理する。実装変更時は本書も更新すること。*
