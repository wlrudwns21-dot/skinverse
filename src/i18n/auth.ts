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
  gateCta: string
  gateLater: string

  // guest mode
  guestBadge: string
  guestScanNotice: string
  guestScanUsed: string

  // analysis
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
    gateCta: '회원가입하기', gateLater: '나중에',

    guestBadge: '둘러보기',
    guestScanNotice: '비회원은 하루 1회 체험할 수 있어요. 결과는 저장되지 않습니다.',
    guestScanUsed: '오늘 체험을 사용했어요 — 내일 다시 가능합니다',

    skinAge: (n) => 'AI 측정 피부 나이 ' + n + '세',
    demoResult: '샘플 결과 · 실제 측정 아님',
    photoNeeded: '사진을 올리면 실제 AI 분석이 실행됩니다. 없으면 샘플 결과를 보여드려요.',
    currentLocation: '현재 위치', useMyLocation: '내 위치로 보기', locating: '위치 확인 중…',
    locationDenied: '위치 권한이 거부되었습니다. 브라우저 주소창의 자물쇠 아이콘에서 허용할 수 있어요.',
    locationUnavailable: '위치를 가져올 수 없습니다. 도시를 직접 선택해주세요.',
    pickCity: '도시 선택', liveWeather: '실시간', sampleWeather: '샘플 값',
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
    gateCta: 'Sign up', gateLater: 'Later',

    guestBadge: 'Browsing',
    guestScanNotice: 'Guests get one trial per day. Results are not saved.',
    guestScanUsed: "Today's trial is used — come back tomorrow",

    skinAge: (n) => 'Skin age ' + n,
    demoResult: 'Sample result · not a measurement',
    photoNeeded: 'Add a photo to run the real AI analysis. Without one we show a sample result.',
    currentLocation: 'Current location', useMyLocation: 'Use my location', locating: 'Finding you…',
    locationDenied: 'Location access was denied. You can allow it from the lock icon in the address bar.',
    locationUnavailable: 'Could not get your location. Please pick a city instead.',
    pickCity: 'Pick a city', liveWeather: 'Live', sampleWeather: 'Sample',
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
    gateCta: '立即注册', gateLater: '稍后',

    guestBadge: '浏览模式',
    guestScanNotice: '非会员每天可体验1次，结果不会保存。',
    guestScanUsed: '今日体验已使用 — 明天再来',

    skinAge: (n) => '肌肤年龄 ' + n + ' 岁',
    demoResult: '示例结果 · 非实际检测',
    photoNeeded: '上传照片即可进行真实AI分析，未上传时显示示例结果。',
    currentLocation: '当前位置', useMyLocation: '使用我的位置', locating: '正在定位…',
    locationDenied: '位置权限被拒绝。可在地址栏的锁形图标中允许。',
    locationUnavailable: '无法获取位置，请手动选择城市。',
    pickCity: '选择城市', liveWeather: '实时', sampleWeather: '示例值',
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
    gateCta: 'สมัครสมาชิก', gateLater: 'ไว้ภายหลัง',

    guestBadge: 'เยี่ยมชม',
    guestScanNotice: 'ผู้ที่ไม่ได้เป็นสมาชิกทดลองได้วันละ 1 ครั้ง ผลลัพธ์จะไม่ถูกบันทึก',
    guestScanUsed: 'ใช้สิทธิ์ทดลองของวันนี้แล้ว — พรุ่งนี้ลองใหม่',

    skinAge: (n) => 'อายุผิว ' + n + ' ปี',
    demoResult: 'ผลตัวอย่าง · ไม่ใช่การวัดจริง',
    photoNeeded: 'เพิ่มรูปเพื่อวิเคราะห์ด้วย AI จริง หากไม่มีเราจะแสดงผลตัวอย่าง',
    currentLocation: 'ตำแหน่งปัจจุบัน', useMyLocation: 'ใช้ตำแหน่งของฉัน', locating: 'กำลังหาตำแหน่ง…',
    locationDenied: 'การเข้าถึงตำแหน่งถูกปฏิเสธ อนุญาตได้จากไอคอนกุญแจในแถบที่อยู่',
    locationUnavailable: 'ไม่สามารถระบุตำแหน่งได้ กรุณาเลือกเมืองแทน',
    pickCity: 'เลือกเมือง', liveWeather: 'เรียลไทม์', sampleWeather: 'ค่าตัวอย่าง',
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
