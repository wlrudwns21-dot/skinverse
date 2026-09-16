import type { Lang } from '../data/types'

/**
 * Strings for everything membership brings: the signup and login forms, the
 * prompts that appear when a guest reaches a member-only action, and the guest
 * mode banners.
 *
 * Kept in one file across all four languages — unlike the screen copy in
 * `en/ko/zh/th.ts`, these belong to a single feature and are easier to keep in
 * step side by side.
 */
export interface AuthStrings {
  // forms
  signUp: string
  logIn: string
  logOut: string
  email: string
  password: string
  passwordHint: string
  passwordConfirm: string
  name: string
  namePlaceholder: string

  /** The rest of what a customer tells us at signup. */
  phone: string
  phonePlaceholder: string
  dialCode: string
  address: string
  addressPlaceholder: string
  postalCode: string
  postalPlaceholder: string
  gender: string
  birthDate: string
  customsCode: string
  customsHelp: string
  customsPlaceholder: string
  optional: string
  /** Heading over the block that is only needed for shipping. */
  deliveryTitle: string
  deliveryHint: string

  errPhone: string
  errBirthDate: string
  errAddress: string
  errCustomsCode: string
  signUpTitle: string
  signUpSub: string
  logInTitle: string
  logInSub: string
  hasAccount: string
  noAccount: string
  submitting: string
  back: string

  // email confirmation
  checkEmail: string
  checkEmailSub: (email: string) => string
  gotIt: string

  // validation and server errors
  errEmail: string
  errPassword: string
  errPasswordMatch: string
  errName: string
  errCredentials: string
  errEmailTaken: string
  errNetwork: string
  errNotConfigured: string

  // member-only prompts
  gateTitle: string
  gateCheckout: string
  gateSaveRoutine: string
  gateMission: string
  gateRedeem: string
  gateMyPage: string
  gateSaveScan: string
  gateScanLimit: string
  gateScanLimitSub: string
  gateScanTitle: string
  gateScanBody: string
  /** The signup pitch on the scan screen itself, before they press anything. */
  scanMemberOnly: string
  scanMemberOnlyCta: string
  gateCta: string
  gateLater: string

  /**
   * The member's own daily analysis allowance is spent. Not a guest-trial
   * message: guests cannot scan at all, so the only person who sees this is a
   * member who has already had their scans today.
   */
  dailyLimitReached: string
  /** How much of today's allowance is left, shown on the home screen. */
  scansLeftToday: (left: number, limit: number) => string
  scansSpentToday: string

  // analysis
  /** Why a photo was refused before it cost a call, or by the vendor after. */
  photoError: Record<
    | 'format' | 'tooLarge' | 'tooSmall' | 'landscape'
    | 'faceTooSmall' | 'faceOutOfBound' | 'tooDark' | 'resolutionHigh'
    | 'noFace' | 'pose' | 'generic',
    string
  >
  photoTips: string[]
  /** Taking the selfie in the app rather than picking one from the photo roll. */
  camera: {
    take: string
    pick: string
    guide: string
    shutter: string
    cancel: string
    denied: string
    missing: string
    failed: string
    flip: string
    usePicker: string
  }
  /** Shown when the analysis failed for a reason that is not the photo's fault. */
  analysisFailed: string
  scanUnavailable: string
  photoRequired: string
  scanFailedTitle: string
  scanRetry: string
  scanFailedHelp: string
  skinAge: (age: number) => string
  demoResult: string
  photoNeeded: string

  // location & weather
  currentLocation: string
  useMyLocation: string
  locating: string
  locationDenied: string
  locationUnavailable: string
  pickCity: string
  liveWeather: string
  sampleWeather: string

  // support
  support: string
  supportTitle: string
  supportSub: string
  supportPlaceholder: string
  supportSend: string
  supportEmpty: string
  supportNew: string
  supportBot: string
  supportStaff: string
  supportYou: string
  supportNoMatch: string
  supportStatus: Record<'bot' | 'open' | 'answered' | 'closed', string>
  supportFaqTitle: string
  supportAsk: string

  // member extras
  saveRoutineCta: string
  routineSaved: string
  savedRoutines: (n: number) => string
  welcome: (name: string) => string
  memberBenefits: string[]
}

export const authStrings: Record<Lang, AuthStrings> = {
  ko: {
    signUp: '회원가입', logIn: '로그인', logOut: '로그아웃',
    email: '이메일', password: '비밀번호', passwordHint: '8자 이상',
    passwordConfirm: '비밀번호 확인', name: '이름', namePlaceholder: '홍길동',
    phone: '연락처', phonePlaceholder: '10-1234-5678', dialCode: '국가번호',
    address: '주소', addressPlaceholder: '도로명 주소, 상세 주소',
    postalCode: '우편번호', postalPlaceholder: '06236',
    gender: '성별', birthDate: '생년월일',
    customsCode: '개인통관고유부호',
    customsHelp: '한국으로 배송받을 때 통관에 쓰입니다. 나중에 입력해도 됩니다.',
    customsPlaceholder: 'P + 숫자 12자리',
    optional: '선택',
    deliveryTitle: '배송 정보',
    deliveryHint: '주문하실 때 쓰입니다. MY에서 언제든 바꿀 수 있어요.',
    errPhone: '연락처를 다시 확인해주세요',
    errBirthDate: '생년월일을 다시 확인해주세요 (만 13세 이상)',
    errAddress: '주소를 입력해주세요',
    errCustomsCode: '개인통관고유부호는 P + 숫자 12자리입니다',
    signUpTitle: 'Skinverse 시작하기',
    signUpSub: '가입하면 분석 기록과 포인트가 저장되고, 구매와 루틴 저장을 이용할 수 있습니다.',
    logInTitle: '다시 오셨네요', logInSub: '이메일로 로그인해주세요.',
    hasAccount: '이미 계정이 있으신가요?', noAccount: '아직 회원이 아니신가요?',
    submitting: '처리 중…', back: '← 뒤로',

    checkEmail: '이메일을 확인해주세요',
    checkEmailSub: (e) => e + ' 로 인증 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다.',
    gotIt: '확인',

    errEmail: '올바른 이메일 주소를 입력해주세요',
    errPassword: '비밀번호는 8자 이상이어야 합니다',
    errPasswordMatch: '비밀번호가 일치하지 않습니다',
    errName: '이름을 입력해주세요',
    errCredentials: '이메일 또는 비밀번호가 올바르지 않습니다',
    errEmailTaken: '이미 가입된 이메일입니다',
    errNetwork: '연결에 실패했습니다. 잠시 후 다시 시도해주세요',
    errNotConfigured: '회원 기능이 아직 설정되지 않았습니다',

    gateTitle: '회원 전용 기능입니다',
    gateCheckout: '구매하려면 회원가입이 필요합니다.',
    gateSaveRoutine: '나만의 루틴을 저장하려면 회원가입이 필요합니다.',
    gateMission: '미션을 완료하고 포인트를 받으려면 회원가입이 필요합니다.',
    gateRedeem: '포인트로 리워드를 교환하려면 회원가입이 필요합니다.',
    gateMyPage: '마이페이지는 회원만 이용할 수 있습니다.',
    gateSaveScan: '분석 기록을 저장하려면 회원가입이 필요합니다.',
    gateScanLimit: '오늘의 체험 분석을 모두 사용했어요',
    gateScanLimitSub: '회원가입하면 횟수 제한 없이 분석하고, 피부 변화를 기록으로 남길 수 있습니다.',
    gateScanTitle: 'AI 피부 분석은 회원 전용이에요',
    gateScanBody: '가입하면 분석 결과가 계정에 저장되고, 다음 분석과 비교해 피부가 어떻게 달라졌는지 추적해드립니다. 이메일만 있으면 30초면 끝나요.',
    scanMemberOnly: 'AI 분석은 회원 전용입니다. 가입하면 결과가 저장되고 변화 추이를 볼 수 있어요.',
    scanMemberOnlyCta: '30초 만에 가입하고 분석받기',
    gateCta: '회원가입하기', gateLater: '나중에',

    dailyLimitReached: '오늘 분석 횟수를 모두 사용했어요 — 내일 다시 가능합니다',
    scansLeftToday: (left, limit) => `오늘 분석 ${left}/${limit}회 남음`,
    scansSpentToday: '오늘 분석을 모두 사용했어요 · 내일 0시에 초기화',

    photoError: {
      format: 'JPG 또는 PNG 파일만 분석할 수 있어요.',
      tooLarge: '사진 용량이 10MB를 넘습니다. 더 작은 사진을 올려주세요.',
      tooSmall: '사진 해상도가 너무 낮습니다. 짧은 쪽이 480px 이상이어야 해요.',
      landscape: '세로 사진일 때 결과가 더 정확합니다.',
      faceTooSmall: '얼굴이 너무 작게 나왔어요. 얼굴 너비가 사진 너비의 60% 이상이 되도록 가까이서 찍어주세요.',
      faceOutOfBound: '얼굴이 사진 밖으로 잘렸어요. 얼굴 전체가 들어오도록 다시 찍어주세요.',
      tooDark: '사진이 너무 어둡습니다. 밝고 고른 조명에서 다시 찍어주세요.',
      resolutionHigh: '사진 해상도가 너무 큽니다.',
      noFace: '사진에서 얼굴을 찾지 못했어요. 얼굴 전체가 보이도록 다시 찍어주세요.',
      pose: '얼굴이 정면을 향하지 않았어요. 카메라를 똑바로 보고 다시 찍어주세요.',
      generic: '이 사진으로는 분석이 어려워요. 다른 사진으로 시도해주세요.',
    },
    photoTips: [
      '얼굴이 사진 가로폭의 60~80%를 차지하게',
      '정면을 보고 입은 다물고 눈은 뜨기',
      '밝고 고른 조명에서 (역광·과노출 피하기)',
      '앞머리는 넘기고 안경은 벗기',
      '메이크업을 지우면 더 정확합니다',
    ],
    camera: {
      take: '카메라로 촬영', pick: '앨범에서 선택',
      guide: '얼굴을 타원에 맞추고 정면을 봐주세요. 촬영 버튼을 누르면 3초 뒤에 찍힙니다.',
      shutter: '촬영', cancel: '취소',
      denied: '카메라 권한이 거부되었습니다. 브라우저 주소창의 자물쇠 아이콘에서 허용하거나, 앨범에서 사진을 선택해주세요.',
      missing: '사용할 수 있는 카메라가 없습니다. 앨범에서 사진을 선택해주세요.',
      failed: '카메라를 열지 못했습니다. 다른 앱이 카메라를 쓰고 있지 않은지 확인해주세요.',
      flip: '전환', usePicker: '앨범에서 선택',
    },
    analysisFailed: '분석에 실패했습니다. 잠시 후 다시 시도해주세요.',
    scanUnavailable: '피부 분석 서비스를 일시적으로 이용할 수 없습니다.',
    photoRequired: '먼저 사진을 촬영하거나 선택해주세요.',
    scanFailedTitle: '분석에 실패했어요',
    scanRetry: '다시 시도하기',
    scanFailedHelp: '밝은 곳에서 얼굴이 가이드 원을 가득 채우도록 정면으로 다시 촬영하면 성공률이 올라갑니다.',
    skinAge: (n) => 'AI 측정 피부 나이 ' + n + '세',
    demoResult: '샘플 결과 · 실제 측정 아님',
    photoNeeded: '사진을 올려야 AI 분석을 시작할 수 있어요.',
    currentLocation: '현재 위치', useMyLocation: '내 위치로 보기', locating: '위치 확인 중…',
    locationDenied: '위치 권한이 거부되었습니다. 브라우저 주소창의 자물쇠 아이콘에서 허용할 수 있어요.',
    locationUnavailable: '위치를 가져올 수 없습니다. 도시를 직접 선택해주세요.',
    pickCity: '도시 선택', liveWeather: '실시간', sampleWeather: '날씨 불러오는 중…',
    support: '문의하기', supportTitle: '무엇을 도와드릴까요?',
    supportSub: '자주 묻는 질문은 즉시 답변드리고, 그 외에는 담당자가 확인 후 답변드립니다.',
    supportPlaceholder: '궁금한 점을 입력해주세요 (예: 배송 얼마나 걸려요?)',
    supportSend: '보내기', supportEmpty: '아직 문의 내역이 없습니다.', supportNew: '새 문의',
    supportBot: '자동 응답', supportStaff: '상담원', supportYou: '나',
    supportNoMatch: '문의를 접수했습니다. 담당자가 확인 후 답변드리겠습니다. 보통 영업일 기준 1일 이내에 회신드려요.',
    supportStatus: { bot: '자동 응답 완료', open: '답변 대기', answered: '답변 완료', closed: '종료' },
    supportFaqTitle: '자주 묻는 질문', supportAsk: '직접 문의하기',
    saveRoutineCta: '이 루틴 저장하기', routineSaved: '루틴을 저장했어요',
    savedRoutines: (n) => '저장한 루틴 ' + n + '개',
    welcome: (n) => n + '님, 환영합니다!',
    memberBenefits: [
      'AI 피부분석 무제한 + 변화 기록 저장',
      '맞춤 제품 구매 및 해외 배송',
      '날씨 루틴 저장 및 미션 포인트 적립',
    ],
  },

  en: {
    signUp: 'Sign up', logIn: 'Log in', logOut: 'Log out',
    email: 'Email', password: 'Password', passwordHint: '8 characters or more',
    passwordConfirm: 'Confirm password', name: 'Name', namePlaceholder: 'Yuki Tanaka',
    phone: 'Phone', phonePlaceholder: '7700 900123', dialCode: 'Code',
    address: 'Address', addressPlaceholder: 'Street address, unit',
    postalCode: 'Postcode', postalPlaceholder: 'SW1A 1AA',
    gender: 'Gender', birthDate: 'Date of birth',
    customsCode: 'Customs clearance code',
    customsHelp: 'Used for customs on deliveries into Korea. You can add it later.',
    customsPlaceholder: 'P followed by 12 digits',
    optional: 'optional',
    deliveryTitle: 'Delivery',
    deliveryHint: 'Used when you order. You can change any of it from MY.',
    errPhone: 'Please check the phone number',
    errBirthDate: 'Please check the date of birth (13 or over)',
    errAddress: 'Please enter an address',
    errCustomsCode: 'The customs code is a P followed by 12 digits',
    signUpTitle: 'Get started with Skinverse',
    signUpSub: 'Members keep their scan history and points, and can buy products and save routines.',
    logInTitle: 'Welcome back', logInSub: 'Log in with your email.',
    hasAccount: 'Already have an account?', noAccount: 'Not a member yet?',
    submitting: 'Working…', back: '← Back',

    checkEmail: 'Check your email',
    checkEmailSub: (e) => 'We sent a confirmation link to ' + e + '. Tap it to finish signing up.',
    gotIt: 'Got it',

    errEmail: 'Enter a valid email address',
    errPassword: 'Password must be at least 8 characters',
    errPasswordMatch: 'Passwords do not match',
    errName: 'Enter your name',
    errCredentials: 'Email or password is incorrect',
    errEmailTaken: 'That email is already registered',
    errNetwork: 'Connection failed. Please try again in a moment',
    errNotConfigured: 'Membership is not set up yet',

    gateTitle: 'Members only',
    gateCheckout: 'Sign up to complete your purchase.',
    gateSaveRoutine: 'Sign up to save your own routine.',
    gateMission: 'Sign up to complete missions and earn points.',
    gateRedeem: 'Sign up to redeem rewards with your points.',
    gateMyPage: 'My Page is for members.',
    gateSaveScan: 'Sign up to keep your analysis history.',
    gateScanLimit: "You've used today's trial analysis",
    gateScanLimitSub: 'Members scan as often as they like and keep a record of how their skin changes.',
    gateScanTitle: 'The AI analysis is for members',
    gateScanBody: 'With an account your results are saved, so the next scan can be compared with this one and you can see what actually changed. An email is all it takes — about thirty seconds.',
    scanMemberOnly: 'The AI analysis is for members. Sign up and your results are saved, with the trend over time.',
    scanMemberOnlyCta: 'Sign up and analyse — 30 seconds',
    gateCta: 'Sign up', gateLater: 'Later',

    dailyLimitReached: 'You have used today’s analyses — come back tomorrow',
    scansLeftToday: (left, limit) => `${left} of ${limit} analyses left today`,
    scansSpentToday: "Today's analyses are used · resets at midnight",

    photoError: {
      format: 'Only JPG and PNG files can be analysed.',
      tooLarge: 'That photo is over 10MB. Please use a smaller one.',
      tooSmall: 'That photo is too low-resolution — the short side needs to be at least 480px.',
      landscape: 'Portrait photos give more accurate results.',
      faceTooSmall: 'Your face is too small in the frame. Move closer so it fills at least 60% of the width.',
      faceOutOfBound: 'Your face is cut off. Please retake with your whole face in frame.',
      tooDark: 'The photo is too dark. Try again in brighter, even lighting.',
      resolutionHigh: 'That photo is too high-resolution.',
      noFace: 'We could not find a face in that photo. Please retake it with your whole face visible.',
      pose: 'Your face is turned away. Look straight into the camera and try again.',
      generic: 'We could not analyse this photo. Please try another one.',
    },
    photoTips: [
      'Face fills 60–80% of the frame width',
      'Look straight ahead, mouth closed, eyes open',
      'Bright, even lighting — avoid backlight and glare',
      'Push your fringe back and take off glasses',
      'Removing makeup gives more accurate results',
    ],
    camera: {
      take: 'Take a photo', pick: 'Choose from photos',
      guide: 'Fit your face in the oval and look straight ahead. The shutter fires 3 seconds after you tap.',
      shutter: 'Capture', cancel: 'Cancel',
      denied: 'Camera access was blocked. Allow it from the padlock icon in the address bar, or choose a photo instead.',
      missing: 'No camera is available. Please choose a photo instead.',
      failed: 'The camera would not open. Check that no other app is using it.',
      flip: 'Flip', usePicker: 'Choose a photo',
    },
    analysisFailed: 'The analysis failed. Please try again in a moment.',
    scanUnavailable: 'Skin analysis is temporarily unavailable.',
    photoRequired: 'Take or choose a photo first.',
    scanFailedTitle: 'The analysis did not complete',
    scanRetry: 'Try again',
    scanFailedHelp: 'Retake it in good light, facing the camera, with your face filling the guide oval — that is what usually fixes it.',
    skinAge: (n) => 'Skin age ' + n,
    demoResult: 'Sample result · not a measurement',
    photoNeeded: 'A photo is needed before the analysis can run.',
    currentLocation: 'Current location', useMyLocation: 'Use my location', locating: 'Finding you…',
    locationDenied: 'Location access was denied. You can allow it from the lock icon in the address bar.',
    locationUnavailable: 'Could not get your location. Please pick a city instead.',
    pickCity: 'Pick a city', liveWeather: 'Live', sampleWeather: 'Loading weather…',
    support: 'Support', supportTitle: 'How can we help?',
    supportSub: 'Common questions are answered instantly; anything else goes to our team.',
    supportPlaceholder: 'Ask us anything (e.g. how long does shipping take?)',
    supportSend: 'Send', supportEmpty: 'No conversations yet.', supportNew: 'New question',
    supportBot: 'Auto reply', supportStaff: 'Support', supportYou: 'You',
    supportNoMatch: "Thanks — we've logged your question. Our team will reply, usually within one business day.",
    supportStatus: { bot: 'Answered automatically', open: 'Waiting for reply', answered: 'Replied', closed: 'Closed' },
    supportFaqTitle: 'Frequently asked', supportAsk: 'Ask a question',
    saveRoutineCta: 'Save this routine', routineSaved: 'Routine saved',
    savedRoutines: (n) => n + ' saved routine' + (n === 1 ? '' : 's'),
    welcome: (n) => 'Welcome, ' + n + '!',
    memberBenefits: [
      'Unlimited AI analysis with saved history',
      'Buy matched products, shipped worldwide',
      'Save weather routines and earn mission points',
    ],
  },

  zh: {
    signUp: '注册', logIn: '登录', logOut: '退出登录',
    email: '邮箱', password: '密码', passwordHint: '至少8位',
    passwordConfirm: '确认密码', name: '姓名', namePlaceholder: '李伟',
    phone: '联系电话', phonePlaceholder: '138 0013 8000', dialCode: '国家代码',
    address: '地址', addressPlaceholder: '街道地址、门牌号',
    postalCode: '邮编', postalPlaceholder: '100000',
    gender: '性别', birthDate: '出生日期',
    customsCode: '个人通关码',
    customsHelp: '寄往韩国时用于清关，也可以稍后填写。',
    customsPlaceholder: 'P + 12 位数字',
    optional: '选填',
    deliveryTitle: '配送信息',
    deliveryHint: '下单时使用，可随时在「MY」中修改。',
    errPhone: '请检查联系电话',
    errBirthDate: '请检查出生日期（须满 13 周岁）',
    errAddress: '请输入地址',
    errCustomsCode: '个人通关码为 P + 12 位数字',
    signUpTitle: '开始使用 Skinverse',
    signUpSub: '注册后可保存分析记录与积分，并可购买商品、保存护肤方案。',
    logInTitle: '欢迎回来', logInSub: '请使用邮箱登录。',
    hasAccount: '已有账号？', noAccount: '还不是会员？',
    submitting: '处理中…', back: '← 返回',

    checkEmail: '请查收邮件',
    checkEmailSub: (e) => '我们已向 ' + e + ' 发送确认链接，点击即可完成注册。',
    gotIt: '知道了',

    errEmail: '请输入有效的邮箱地址',
    errPassword: '密码至少需要8位',
    errPasswordMatch: '两次输入的密码不一致',
    errName: '请输入姓名',
    errCredentials: '邮箱或密码不正确',
    errEmailTaken: '该邮箱已注册',
    errNetwork: '连接失败，请稍后重试',
    errNotConfigured: '会员功能尚未配置',

    gateTitle: '会员专属功能',
    gateCheckout: '注册后即可完成购买。',
    gateSaveRoutine: '注册后可保存专属护肤方案。',
    gateMission: '注册后可完成任务并赚取积分。',
    gateRedeem: '注册后可用积分兑换奖励。',
    gateMyPage: '我的页面仅限会员使用。',
    gateSaveScan: '注册后可保存分析记录。',
    gateScanLimit: '今日体验次数已用完',
    gateScanLimitSub: '注册会员可无限次分析，并记录肌肤变化。',
    gateScanTitle: 'AI 肌肤分析为会员专享',
    gateScanBody: '注册后分析结果会保存到账户，可与下次分析对比，看到肌肤的实际变化。只需邮箱，约30秒即可完成。',
    scanMemberOnly: 'AI 分析为会员专享。注册后结果会保存，并可查看变化趋势。',
    scanMemberOnlyCta: '30秒注册并开始分析',
    gateCta: '立即注册', gateLater: '稍后',

    dailyLimitReached: '今日检测次数已用完 — 明天再来',
    scansLeftToday: (left, limit) => `今日剩余检测 ${left}/${limit} 次`,
    scansSpentToday: '今日检测已用完 · 午夜重置',

    photoError: {
      format: '仅支持 JPG 或 PNG 格式。',
      tooLarge: '照片超过 10MB，请换一张更小的。',
      tooSmall: '照片分辨率过低，短边需至少 480 像素。',
      landscape: '竖向照片的结果更准确。',
      faceTooSmall: '面部在画面中太小。请靠近一些，让面部宽度占画面宽度的 60% 以上。',
      faceOutOfBound: '面部被裁切了，请重新拍摄完整的脸部。',
      tooDark: '照片太暗，请在明亮均匀的光线下重拍。',
      resolutionHigh: '照片分辨率过高。',
      noFace: '照片中未能识别到面部，请重新拍摄并露出完整面部。',
      pose: '面部未正对镜头，请直视镜头后重新拍摄。',
      generic: '无法分析这张照片，请换一张试试。',
    },
    photoTips: [
      '面部占画面宽度的 60~80%',
      '正视镜头，闭嘴睁眼',
      '光线明亮均匀，避免逆光和过曝',
      '梳起刘海并摘下眼镜',
      '卸妆后结果更准确',
    ],
    camera: {
      take: '拍照', pick: '从相册选择',
      guide: '将面部对准椭圆并正视前方。点击快门后 3 秒拍摄。',
      shutter: '拍摄', cancel: '取消',
      denied: '相机权限被拒绝。请在地址栏的锁形图标中允许，或改为从相册选择照片。',
      missing: '没有可用的相机，请改为从相册选择照片。',
      failed: '无法打开相机。请确认没有其他应用正在使用相机。',
      flip: '切换', usePicker: '从相册选择',
    },
    analysisFailed: '分析失败，请稍后再试。',
    scanUnavailable: '肌肤分析服务暂时无法使用。',
    photoRequired: '请先拍摄或选择照片。',
    scanFailedTitle: '分析未能完成',
    scanRetry: '重新尝试',
    scanFailedHelp: '在光线充足处正对镜头，让面部填满引导圆圈后重新拍摄，通常就能成功。',
    skinAge: (n) => '肌肤年龄 ' + n + ' 岁',
    demoResult: '示例结果 · 非实际检测',
    photoNeeded: '需要先上传照片才能开始分析。',
    currentLocation: '当前位置', useMyLocation: '使用我的位置', locating: '正在定位…',
    locationDenied: '位置权限被拒绝。可在地址栏的锁形图标中允许。',
    locationUnavailable: '无法获取位置，请手动选择城市。',
    pickCity: '选择城市', liveWeather: '实时', sampleWeather: '正在获取天气…',
    support: '联系客服', supportTitle: '需要什么帮助？',
    supportSub: '常见问题将立即回复，其他问题由客服人员确认后回复。',
    supportPlaceholder: '请输入您的问题（例如：配送需要多久？）',
    supportSend: '发送', supportEmpty: '暂无咨询记录。', supportNew: '新咨询',
    supportBot: '自动回复', supportStaff: '客服', supportYou: '我',
    supportNoMatch: '已收到您的咨询，客服人员确认后会尽快回复，通常在一个工作日内。',
    supportStatus: { bot: '已自动回复', open: '等待回复', answered: '已回复', closed: '已结束' },
    supportFaqTitle: '常见问题', supportAsk: '直接咨询',
    saveRoutineCta: '保存此方案', routineSaved: '方案已保存',
    savedRoutines: (n) => '已保存 ' + n + ' 个方案',
    welcome: (n) => n + '，欢迎！',
    memberBenefits: [
      'AI 肌肤分析无限次 + 记录保存',
      '购买匹配产品，全球直邮',
      '保存天气方案并赚取任务积分',
    ],
  },

  th: {
    signUp: 'สมัครสมาชิก', logIn: 'เข้าสู่ระบบ', logOut: 'ออกจากระบบ',
    email: 'อีเมล', password: 'รหัสผ่าน', passwordHint: 'อย่างน้อย 8 ตัวอักษร',
    passwordConfirm: 'ยืนยันรหัสผ่าน', name: 'ชื่อ', namePlaceholder: 'พลอย',
    phone: 'เบอร์โทร', phonePlaceholder: '81 234 5678', dialCode: 'รหัสประเทศ',
    address: 'ที่อยู่', addressPlaceholder: 'ที่อยู่ เลขที่ห้อง',
    postalCode: 'รหัสไปรษณีย์', postalPlaceholder: '10110',
    gender: 'เพศ', birthDate: 'วันเกิด',
    customsCode: 'รหัสผ่านพิธีการศุลกากร',
    customsHelp: 'ใช้สำหรับการนำเข้าไปเกาหลี กรอกภายหลังได้',
    customsPlaceholder: 'P ตามด้วยตัวเลข 12 หลัก',
    optional: 'ไม่บังคับ',
    deliveryTitle: 'ข้อมูลจัดส่ง',
    deliveryHint: 'ใช้ตอนสั่งซื้อ แก้ไขได้ทุกเมื่อจากหน้า MY',
    errPhone: 'กรุณาตรวจสอบเบอร์โทร',
    errBirthDate: 'กรุณาตรวจสอบวันเกิด (อายุ 13 ปีขึ้นไป)',
    errAddress: 'กรุณากรอกที่อยู่',
    errCustomsCode: 'รหัสศุลกากรคือ P ตามด้วยตัวเลข 12 หลัก',
    signUpTitle: 'เริ่มต้นกับ Skinverse',
    signUpSub: 'สมาชิกจะเก็บประวัติการวิเคราะห์และแต้มไว้ ซื้อสินค้าและบันทึกรูทีนได้',
    logInTitle: 'ยินดีต้อนรับกลับมา', logInSub: 'เข้าสู่ระบบด้วยอีเมลของคุณ',
    hasAccount: 'มีบัญชีอยู่แล้ว?', noAccount: 'ยังไม่เป็นสมาชิก?',
    submitting: 'กำลังดำเนินการ…', back: '← กลับ',

    checkEmail: 'กรุณาตรวจสอบอีเมล',
    checkEmailSub: (e) => 'เราส่งลิงก์ยืนยันไปที่ ' + e + ' แล้ว กดลิงก์เพื่อสมัครให้เสร็จ',
    gotIt: 'รับทราบ',

    errEmail: 'กรุณากรอกอีเมลให้ถูกต้อง',
    errPassword: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    errPasswordMatch: 'รหัสผ่านไม่ตรงกัน',
    errName: 'กรุณากรอกชื่อ',
    errCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    errEmailTaken: 'อีเมลนี้ถูกใช้สมัครแล้ว',
    errNetwork: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    errNotConfigured: 'ระบบสมาชิกยังไม่ได้ตั้งค่า',

    gateTitle: 'เฉพาะสมาชิก',
    gateCheckout: 'สมัครสมาชิกเพื่อสั่งซื้อ',
    gateSaveRoutine: 'สมัครสมาชิกเพื่อบันทึกรูทีนของคุณ',
    gateMission: 'สมัครสมาชิกเพื่อทำภารกิจและรับแต้ม',
    gateRedeem: 'สมัครสมาชิกเพื่อแลกของรางวัลด้วยแต้ม',
    gateMyPage: 'หน้าของฉันสำหรับสมาชิกเท่านั้น',
    gateSaveScan: 'สมัครสมาชิกเพื่อเก็บประวัติการวิเคราะห์',
    gateScanLimit: 'คุณใช้สิทธิ์ทดลองของวันนี้แล้ว',
    gateScanLimitSub: 'สมาชิกวิเคราะห์ได้ไม่จำกัด และเก็บบันทึกการเปลี่ยนแปลงของผิวได้',
    gateScanTitle: 'การวิเคราะห์ด้วย AI สำหรับสมาชิกเท่านั้น',
    gateScanBody: 'เมื่อสมัครแล้วผลวิเคราะห์จะถูกบันทึกไว้ในบัญชี เพื่อเปรียบเทียบกับครั้งถัดไปและดูว่าผิวเปลี่ยนไปอย่างไรจริง ๆ ใช้แค่อีเมล ประมาณ 30 วินาที',
    scanMemberOnly: 'การวิเคราะห์ด้วย AI สำหรับสมาชิกเท่านั้น สมัครแล้วผลจะถูกบันทึกพร้อมดูแนวโน้มได้',
    scanMemberOnlyCta: 'สมัครใน 30 วินาทีแล้ววิเคราะห์เลย',
    gateCta: 'สมัครสมาชิก', gateLater: 'ไว้ภายหลัง',

    dailyLimitReached: 'ใช้สิทธิ์วิเคราะห์ของวันนี้ครบแล้ว — พรุ่งนี้ลองใหม่',
    scansLeftToday: (left, limit) => `เหลือ ${left}/${limit} ครั้งวันนี้`,
    scansSpentToday: 'ใช้สิทธิ์วันนี้ครบแล้ว · รีเซ็ตตอนเที่ยงคืน',

    photoError: {
      format: 'รองรับเฉพาะไฟล์ JPG หรือ PNG เท่านั้น',
      tooLarge: 'รูปมีขนาดเกิน 10MB กรุณาใช้รูปที่เล็กกว่านี้',
      tooSmall: 'ความละเอียดต่ำเกินไป ด้านสั้นต้องมีอย่างน้อย 480 พิกเซล',
      landscape: 'รูปแนวตั้งให้ผลลัพธ์แม่นยำกว่า',
      faceTooSmall: 'ใบหน้าเล็กเกินไป กรุณาเข้าใกล้ให้ใบหน้ากว้างอย่างน้อย 60% ของภาพ',
      faceOutOfBound: 'ใบหน้าถูกตัดขอบ กรุณาถ่ายใหม่ให้เห็นใบหน้าทั้งหมด',
      tooDark: 'ภาพมืดเกินไป กรุณาถ่ายใหม่ในที่ที่มีแสงสว่างสม่ำเสมอ',
      resolutionHigh: 'ความละเอียดของภาพสูงเกินไป',
      noFace: 'ไม่พบใบหน้าในภาพนี้ กรุณาถ่ายใหม่ให้เห็นใบหน้าทั้งหมด',
      pose: 'ใบหน้าไม่ได้หันเข้ากล้อง กรุณามองตรงเข้ากล้องแล้วถ่ายใหม่',
      generic: 'ไม่สามารถวิเคราะห์รูปนี้ได้ กรุณาลองรูปอื่น',
    },
    photoTips: [
      'ใบหน้ากินพื้นที่ 60–80% ของความกว้างภาพ',
      'มองตรง ปิดปาก ลืมตา',
      'แสงสว่างสม่ำเสมอ เลี่ยงย้อนแสงและแสงจ้า',
      'รวบผมหน้าและถอดแว่น',
      'ล้างเครื่องสำอางออกจะแม่นยำกว่า',
    ],
    camera: {
      take: 'ถ่ายรูป', pick: 'เลือกจากคลังภาพ',
      guide: 'จัดใบหน้าให้อยู่ในวงรีและมองตรง กดชัตเตอร์แล้วจะถ่ายใน 3 วินาที',
      shutter: 'ถ่าย', cancel: 'ยกเลิก',
      denied: 'การเข้าถึงกล้องถูกปฏิเสธ อนุญาตได้จากไอคอนกุญแจในแถบที่อยู่ หรือเลือกรูปจากคลังภาพแทน',
      missing: 'ไม่พบกล้องที่ใช้ได้ กรุณาเลือกรูปจากคลังภาพแทน',
      failed: 'เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบว่าไม่มีแอปอื่นใช้กล้องอยู่',
      flip: 'สลับ', usePicker: 'เลือกจากคลังภาพ',
    },
    analysisFailed: 'การวิเคราะห์ล้มเหลว กรุณาลองใหม่อีกครั้ง',
    scanUnavailable: 'ขณะนี้ไม่สามารถใช้บริการวิเคราะห์ผิวได้ชั่วคราว',
    photoRequired: 'กรุณาถ่ายหรือเลือกรูปก่อน',
    scanFailedTitle: 'การวิเคราะห์ไม่สำเร็จ',
    scanRetry: 'ลองใหม่',
    scanFailedHelp: 'ถ่ายใหม่ในที่สว่าง หันหน้าเข้ากล้อง ให้ใบหน้าเต็มวงรีนำทาง มักจะแก้ปัญหาได้',
    skinAge: (n) => 'อายุผิว ' + n + ' ปี',
    demoResult: 'ผลตัวอย่าง · ไม่ใช่การวัดจริง',
    photoNeeded: 'ต้องมีรูปก่อนจึงจะเริ่มวิเคราะห์ได้',
    currentLocation: 'ตำแหน่งปัจจุบัน', useMyLocation: 'ใช้ตำแหน่งของฉัน', locating: 'กำลังหาตำแหน่ง…',
    locationDenied: 'การเข้าถึงตำแหน่งถูกปฏิเสธ อนุญาตได้จากไอคอนกุญแจในแถบที่อยู่',
    locationUnavailable: 'ไม่สามารถระบุตำแหน่งได้ กรุณาเลือกเมืองแทน',
    pickCity: 'เลือกเมือง', liveWeather: 'เรียลไทม์', sampleWeather: 'กำลังโหลดสภาพอากาศ…',
    support: 'ติดต่อเรา', supportTitle: 'ให้เราช่วยอะไรดี?',
    supportSub: 'คำถามที่พบบ่อยจะตอบทันที ส่วนเรื่องอื่นทีมงานจะตรวจสอบและตอบกลับ',
    supportPlaceholder: 'พิมพ์คำถามของคุณ (เช่น จัดส่งใช้เวลานานแค่ไหน?)',
    supportSend: 'ส่ง', supportEmpty: 'ยังไม่มีประวัติการสอบถาม', supportNew: 'คำถามใหม่',
    supportBot: 'ตอบอัตโนมัติ', supportStaff: 'เจ้าหน้าที่', supportYou: 'คุณ',
    supportNoMatch: 'รับเรื่องแล้ว ทีมงานจะตอบกลับโดยปกติภายใน 1 วันทำการ',
    supportStatus: { bot: 'ตอบอัตโนมัติแล้ว', open: 'รอการตอบกลับ', answered: 'ตอบกลับแล้ว', closed: 'ปิดเรื่อง' },
    supportFaqTitle: 'คำถามที่พบบ่อย', supportAsk: 'สอบถามเพิ่มเติม',
    saveRoutineCta: 'บันทึกรูทีนนี้', routineSaved: 'บันทึกรูทีนแล้ว',
    savedRoutines: (n) => 'รูทีนที่บันทึกไว้ ' + n + ' รายการ',
    welcome: (n) => 'ยินดีต้อนรับ ' + n + '!',
    memberBenefits: [
      'วิเคราะห์ผิวด้วย AI ไม่จำกัด พร้อมเก็บประวัติ',
      'ซื้อสินค้าที่เหมาะกับคุณ ส่งทั่วโลก',
      'บันทึกรูทีนตามอากาศและรับแต้มจากภารกิจ',
    ],
  },
}

export function authT(lang: Lang): AuthStrings {
  return authStrings[lang] ?? authStrings.ko
}
