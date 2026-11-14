import type { Language } from '../lib/language';

const en = {
  appName: 'Teleprompter',
  scriptLabel: 'Script',
  scriptPlaceholder: 'Paste your script here…',
  scriptHint: 'Text in [square brackets] is shown but skipped while reading.',
  useSampleScript: 'Use sample script',
  emptyTitle: 'No script yet',
  emptyBody: 'Write or paste your script in the settings.',
  editScript: 'Edit script',
  unsupportedTitle: 'Voice tracking is unavailable',
  unsupportedBody:
    'This browser does not support speech recognition. Use Chrome, Edge or Safari. You can still scroll with the arrow keys.',
  micDeniedTitle: 'Microphone access was denied',
  micDeniedBody: 'Allow microphone access in your browser settings and try again.',
  speechErrorTitle: 'Speech recognition stopped',
  speechErrorBody: (detail: string) => `Reason: ${detail}`,
  dismiss: 'Dismiss',

  settings: 'Settings',
  settingsDescription: 'Changes are saved on this device.',
  close: 'Close',
  sectionLanguage: 'Language',
  sectionDisplay: 'Display',
  uiLanguage: 'Interface language',
  speechLanguage: 'Speech language',
  speechLanguageHint: 'Auto-detect picks the language from your script.',
  languageAuto: 'Auto-detect',
  languageAutoResolved: (name: string) => `Auto-detect (${name})`,
  fontSize: 'Font size',
  marginX: 'Left and right margin',
  marginY: 'Top and bottom margin',
  mirror: 'Mirror text',
  mirrorHint: 'Flip horizontally for teleprompter glass.',
  lineWrap: 'Line wrapping',
  lineWrapOption: {
    words: {
      label: 'Keep words whole',
      description: 'Lines break only between words. Easier to read.',
    },
    anywhere: {
      label: 'Wrap anywhere',
      description: 'Lines break at any character, so every line is filled.',
    },
  },
  resetSettings: 'Reset to defaults',

  playback: 'Playback controls',
  restart: 'Restart',
  previousWord: 'Previous word',
  nextWord: 'Next word',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  listen: 'Start listening',
  stopListening: 'Stop listening',
  listening: 'Listening',
  paused: 'Paused',
  progress: 'Reading progress',
  heard: 'Heard',
};

export type Messages = typeof en;

const ko: Messages = {
  appName: '텔레프롬프터',
  scriptLabel: '원고',
  scriptPlaceholder: '여기에 원고를 붙여넣으세요…',
  scriptHint: '[대괄호] 안의 글은 화면에 보이지만 읽을 때는 건너뛰어요.',
  useSampleScript: '예시 원고 사용',
  emptyTitle: '아직 원고가 없어요',
  emptyBody: '설정에서 원고를 쓰거나 붙여넣으세요.',
  editScript: '원고 편집',
  unsupportedTitle: '음성 추적을 사용할 수 없어요',
  unsupportedBody:
    '이 브라우저는 음성 인식을 지원하지 않아요. Chrome, Edge, Safari를 사용하세요. 화살표 키로는 계속 이동할 수 있어요.',
  micDeniedTitle: '마이크 권한이 거부됐어요',
  micDeniedBody: '브라우저 설정에서 마이크 접근을 허용한 뒤 다시 시도하세요.',
  speechErrorTitle: '음성 인식이 멈췄어요',
  speechErrorBody: (detail) => `원인: ${detail}`,
  dismiss: '닫기',

  settings: '설정',
  settingsDescription: '변경 사항은 이 기기에 저장돼요.',
  close: '닫기',
  sectionLanguage: '언어',
  sectionDisplay: '화면',
  uiLanguage: '화면 언어',
  speechLanguage: '음성 인식 언어',
  speechLanguageHint: '자동 감지는 원고의 언어를 보고 골라요.',
  languageAuto: '자동 감지',
  languageAutoResolved: (name) => `자동 감지 (${name})`,
  fontSize: '글자 크기',
  marginX: '좌우 여백',
  marginY: '상하 여백',
  mirror: '좌우 반전',
  mirrorHint: '프롬프터 유리에 비출 때 사용해요.',
  lineWrap: '줄바꿈',
  lineWrapOption: {
    words: {
      label: '단어 단위',
      description: '단어 사이에서만 줄을 바꿔요. 읽기 편해요.',
    },
    anywhere: {
      label: '글자 단위',
      description: '어느 글자에서나 줄을 바꿔 한 줄을 꽉 채워요.',
    },
  },
  resetSettings: '기본값으로 초기화',

  playback: '재생 컨트롤',
  restart: '처음부터',
  previousWord: '이전 단어',
  nextWord: '다음 단어',
  enterFullscreen: '전체화면',
  exitFullscreen: '전체화면 나가기',
  listen: '듣기 시작',
  stopListening: '듣기 중지',
  listening: '듣는 중',
  paused: '일시정지',
  progress: '읽은 정도',
  heard: '인식된 말',
};

const ja: Messages = {
  appName: 'テレプロンプター',
  scriptLabel: '原稿',
  scriptPlaceholder: 'ここに原稿を貼り付けてください…',
  scriptHint: '[角かっこ] 内のテキストは表示されますが、読み上げ時はスキップされます。',
  useSampleScript: 'サンプル原稿を使う',
  emptyTitle: '原稿がまだありません',
  emptyBody: '設定で原稿を入力するか貼り付けてください。',
  editScript: '原稿を編集',
  unsupportedTitle: '音声追跡は利用できません',
  unsupportedBody:
    'このブラウザは音声認識に対応していません。Chrome、Edge、Safari を使用してください。矢印キーでの移動は引き続き使えます。',
  micDeniedTitle: 'マイクへのアクセスが拒否されました',
  micDeniedBody: 'ブラウザの設定でマイクへのアクセスを許可してから、もう一度お試しください。',
  speechErrorTitle: '音声認識が停止しました',
  speechErrorBody: (detail) => `原因: ${detail}`,
  dismiss: '閉じる',

  settings: '設定',
  settingsDescription: '変更はこのデバイスに保存されます。',
  close: '閉じる',
  sectionLanguage: '言語',
  sectionDisplay: '表示',
  uiLanguage: '表示言語',
  speechLanguage: '音声認識の言語',
  speechLanguageHint: '自動検出では原稿の言語から選びます。',
  languageAuto: '自動検出',
  languageAutoResolved: (name) => `自動検出 (${name})`,
  fontSize: '文字サイズ',
  marginX: '左右の余白',
  marginY: '上下の余白',
  mirror: '左右反転',
  mirrorHint: 'プロンプター用ガラスに映すときに使います。',
  lineWrap: '改行',
  lineWrapOption: {
    words: {
      label: '単語ごと',
      description: '単語の間でのみ改行します。読みやすくなります。',
    },
    anywhere: {
      label: '文字ごと',
      description: 'どの文字でも改行し、各行をいっぱいに使います。',
    },
  },
  resetSettings: '初期設定に戻す',

  playback: '再生コントロール',
  restart: '最初から',
  previousWord: '前の単語',
  nextWord: '次の単語',
  enterFullscreen: '全画面表示',
  exitFullscreen: '全画面表示を終了',
  listen: '聞き取りを開始',
  stopListening: '聞き取りを停止',
  listening: '聞き取り中',
  paused: '一時停止',
  progress: '読んだ割合',
  heard: '認識された言葉',
};

export const MESSAGES: Record<Language, Messages> = { en, ko, ja };

export const SAMPLE_SCRIPT: Record<Language, string> = {
  en: `Welcome to the teleprompter. Press the microphone button below, then read this aloud.
The text follows your voice, and the highlighted word shows where you are. [Pause here]

To use your own script, open the settings with the gear button and replace this text.
You can also click any word to jump to it.`,
  ko: `텔레프롬프터에 오신 것을 환영합니다. 아래 마이크 버튼을 누르고 소리 내어 읽어 보세요.
목소리를 따라 원고가 움직이고, 강조된 단어가 지금 읽고 있는 위치예요. [잠시 멈춤]

내 원고를 쓰려면 톱니바퀴 버튼으로 설정을 열고 이 글을 바꾸세요.
단어를 클릭하면 그 위치로 바로 이동할 수도 있어요.`,
  ja: `テレプロンプターへようこそ。下のマイクボタンを押して、声に出して読んでみてください。
声に合わせて原稿が進み、強調された単語が今読んでいる位置です。[ここで一呼吸]

自分の原稿を使うには、歯車ボタンで設定を開いてこの文章を置き換えてください。
単語をクリックすると、その位置に移動できます。`,
};
