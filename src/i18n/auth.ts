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
