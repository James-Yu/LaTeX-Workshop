# セキュリティ対策サマリー

この文書は、TeX Workspace Secure で実施した主要なセキュリティ対策と、それらの対策で低減しようとしているリスクを要約したものです。

この secure build は、上流版の機能をそのまま広く維持することを目的にしていません。目的は、企業利用を想定した TeX 編集・ビルド用途に必要な範囲へ機能面を絞り、より小さく監査しやすい拡張にすることです。

## 対策したこと

### 1. 共同編集機能とネットワーク露出のある実行系を削減

この secure build では、Live Share 連携、内部 PDF preview server、ブラウザベースの preview フロー、および内部 viewer runtime に依存していた SyncTeX 経路を無効化しています。

未対応だった場合のリスク:

- ネットワーク経由やメッセージ処理を伴う面が増え、parser、webview、transport まわりの不具合がセキュリティ問題化しやすくなります。
- 内部 preview 基盤により、信頼しなければならない実装範囲が、編集とコンパイルの中核部分を超えて広がります。
- 共同編集や preview 機能により、workspace 内容が特権的な拡張挙動を引き起こす経路が増えます。

### 2. workspace 起点の外部コマンド実行を抑制

この secure build では、workspace スコープの build recipes、tools、external build commands の override を遮断または制約し、重要な実行経路では workspace 起点の command path 実行前に警告を出します。

未対応だった場合のリスク:

- リポジトリ側が、ビルド時に任意のローカルバイナリや shell 引数を実行する command を定義または誘導できます。
- team-wide settings sync や workspace 設定のコピーによって、危険な command 実行パターンが見えにくいまま定着するおそれがあります。
- 脅威モデルが「信頼できない文書を開く」から「信頼されたローカルプロセスを文書が起動させる」に変わります。

### 3. magic command comment を secure build では無効化

TeX ソース内の comment から tool や recipe の選択を変更できる magic command comment を無視するようにしています。

未対応だった場合のリスク:

- 文書側が、利用者の想定しない executable や build flow に拡張を誘導できます。
- 設定ファイルは確認しても、TeX comment に埋め込まれた executable 選択ロジックを見落としやすくなります。
- command の由来や責任境界が、統制環境で監査しにくくなります。

### 4. 非必須の command surface を削減

texdoc、word count、math preview panel、外部 formatter 連携、自動 lint 実行など、追加の tool や UI subsystem を使う convenience feature を削除または無効化しています。

未対応だった場合のリスク:

- 追加の command surface ごとに、parsing、process spawn、document processing の実装を別途レビュー・保守する必要が生じます。
- convenience feature は保存時やバックグラウンドで動作しやすく、利用者から見た挙動の可視性が下がります。
- 中核の編集・コンパイルに不要な機能へまでレビュー工数が分散します。

### 5. `vsls` 固有の処理と legacy compatibility path を削減

Live Share URI 処理や、無効化済みの collaboration/viewer workflow だけのために残っていた互換コードを削っています。

未対応だった場合のリスク:

- 主機能を無効化したつもりでも、古い code path が到達可能なまま残ることがあります。
- 複数機能をまたぐ互換ロジックは理解しづらく、レビューで見落とされやすくなります。

### 6. 開発依存関係の衛生状態を改善

development dependency を更新し、必要な箇所には targeted override を加えて、local audit を clean に保ちつつ release tooling が動作するようにしています。

未対応だった場合のリスク:

- 開発ツールチェーンの既知問題が、local packaging、CI pipeline、maintainer workstation に影響するおそれがあります。
- production dependency が安定していても、保守上のセキュリティ態勢が時間とともに劣化します。

## この fork が目指すセキュリティ姿勢

TeX Workspace Secure は、企業利用で価値の高い次の機能を残すことを意図しています。

- 編集支援
- completion と snippets
- root file の検出
- build orchestration
- log parsing

不要な attack surface を残すくらいなら、feature parity を優先しない、という方針です。

## この fork だけでは保証しないこと

- 任意の TeX toolchain 自体を安全にするものではありません。
- workstation hardening、sandboxing、企業ポリシーによる制御を代替するものではありません。
- ホスト側に入っている LaTeX executable、script、package の検証を不要にするものではありません。
- 将来の upstream dependency や変更が常に無リスクであることを保証するものではありません。

## 推奨する運用前提

- 承認済みの TeX toolchain を使い、継続的に patch を適用すること。
- workspace file はレビュー前提で扱い、初期状態では信頼しないこと。
- workspace 側の command customization よりも、中央管理された設定を優先すること。
- preview server、browser viewer、collaboration feature、自動 process execution を再導入する変更は個別に再評価すること。