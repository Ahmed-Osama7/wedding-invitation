/**
 * Bilingual copy for the wedding invitation SPA (Arabic / English).
 * Loaded as ES module; consumed by script.js for DOM updates and validation strings.
 */

export const STORAGE_KEY = 'wedding-invitation-lang';

export const TRANSLATIONS = {
  ar: {
    meta: {
      description: 'دعوة زفاف فاخرة — ريم وعبدالرحمن',
      title: 'دعوة زفاف | ريم وعبدالرحمن',
    },
    loading: {
      text: 'ننتظر لحظتكم الجميلة',
    },
    music: {
      ariaLabel: 'تشغيل أو إيقاف الموسيقى الخلفية',
      title: 'الموسيقى',
    },
    langSwitcher: {
      ariaLabel: 'اختيار اللغة: العربية أو الإنجليزية',
      btnArAria: 'العربية',
      btnEnAria: 'English',
    },
    nav: {
      brand: 'زفاف',
      countdown: 'العد التنازلي',
      venue: 'المكان',
      message: 'رسالة',
      rsvp: 'تأكيد الحضور',
      menuAria: 'القائمة',
    },
    hero: {
      kicker: 'بكل حب ووفاء',
      invitationTitle: 'دعوة زفاف',
      coupleNames: 'ريم & عبدالرحمن',
      subtitle:
        'ندعوكم لاستكمال قصة الحب بلمسة من النور، حيث يلتقي القلبان تحت سماء من الحرير والنجوم.',
      cta: 'اكتشف التفاصيل',
    },
    countdown: {
      coupleLine: 'ريم & عبدالرحمن',
      eyebrow: 'حتى ليلة العمر',
      title: 'العد التنازلي',
      desc: '٥ يونيو — الساعة ٩ مساءً',
      days: 'أيام',
      hours: 'ساعات',
      minutes: 'دقائق',
      seconds: 'ثوانٍ',
    },
    venue: {
      eyebrow: 'أين تلتقي القلوب',
      title: 'قاعة الاحتفال',
      text:
        'في فضاء صُمم للضوء الناعم والذكريات الدائمة، نستقبلكم في أجواء راقية تجمع بين البساطة والفخامة.',
      mapBtn: 'فتح الموقع على خرائط Google',
      placeholder: 'الخريطة تنتظر خطواتكم',
      placeholderSub: 'وصولكم يكمّل القصة.',
    },
    messages: {
      eyebrow: 'رسالة من القلب',
      title: 'أهدونا كلماتكم',
      desc: 'اكتبوا لنا أمنية، أو ارسموا توقيعاً دافئاً — كل لمسة تُحفظ بحب.',
      nameLabel: 'اسمكم الطيب',
      namePlaceholder: 'مثال: سارة وعمر',
      messageLabel: 'رسالتكم',
      messagePlaceholder: 'من قلبٍ إلى قلبٍ… دعواتكم تُضيء يومنا.',
      canvasLabel: 'توقيع أو رسم (اختياري)',
      canvasClear: 'مسح اللوحة',
      canvasAria: 'منطقة الرسم والتوقيع',
      canvasHint: 'اسحبوا بإصبعكم أو القلم على الشاشة — نحفظ الرسم كصورة.',
      submit: 'إرسال الرسالة',
    },
    rsvp: {
      eyebrow: 'تأكيد الحضور',
      title: 'تأكيد الحضور',
      desc: 'يسرّنا معرفة إن كنتم معنا في هذه الأمسية، لنرتب لكم أجمل استقبال.',
      nameLabel: 'الاسم الكريم',
      namePlaceholder: 'الاسم الثلاثي',
      attendLegend: 'هل ستحضرون؟',
      yes: 'نعم',
      no: 'لا',
      guestCountLabel: 'عدد الضيوف',
      guestCountPlaceholder: '1',
      noteLabel: 'ملاحظة (اختياري)',
      notePlaceholder: 'حساسية غذائية، مقعد، أو أي تفاصيل تهمكم',
      submit: 'إرسال التأكيد',
    },
    footer: {
      line: 'بحبٍ يفوق الكلمات، ننتظركم في أمسية تُشبه الحلم.',
      meta: 'دعوة زفاف · ٢٠٢٦',
    },
    forms: {
      defaultGuestName: 'ضيف كريم',
      msgEmpty: 'يرجى كتابة رسالة قبل الإرسال.',
      msgSuccess: 'شكراً — وصلت رسالتكم بلطف، وتُحفظ مع ذكرياتنا.',
      msgError: 'تعذر الإرسال مؤقتاً. حاولوا لاحقاً أو تحققوا من الاتصال.',
      rsvpName: 'يرجى إدخال الاسم.',
      rsvpAttend: 'يرجى اختيار الحضور (نعم أو لا).',
      rsvpCount: 'عدد الضيوف يجب أن يكون بين ١ و ٢٠.',
      rsvpSuccess: 'تم استلام تأكيدكم — ننتظركم بشوق أو نشكر لطفكم.',
      rsvpError: 'تعذر حفظ التأكيد. حاولوا لاحقاً.',
    },
  },
  en: {
    meta: {
      description: 'An elegant wedding invitation — Reem & Abdulrahman',
      title: 'Wedding Invitation | Reem & Abdulrahman',
    },
    loading: {
      text: 'Awaiting your beautiful moment',
    },
    music: {
      ariaLabel: 'Play or pause background music',
      title: 'Music',
    },
    langSwitcher: {
      ariaLabel: 'Choose language: Arabic or English',
      btnArAria: 'Arabic',
      btnEnAria: 'English',
    },
    nav: {
      brand: 'Wedding',
      countdown: 'Countdown',
      venue: 'Venue',
      message: 'Message',
      rsvp: 'RSVP',
      menuAria: 'Menu',
    },
    hero: {
      kicker: 'With love and devotion',
      invitationTitle: 'Wedding Invitation',
      coupleNames: 'Reem & Abdulrahman',
      subtitle:
        'We invite you to continue our love story in a glow of light — two hearts meeting beneath a sky of silk and stars.',
      cta: 'Discover the details',
    },
    countdown: {
      coupleLine: 'Reem & Abdulrahman',
      eyebrow: 'Until our forever night',
      title: 'Countdown',
      desc: 'June 5 · 9:00 PM',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
    },
    venue: {
      eyebrow: 'Where hearts meet',
      title: 'The celebration hall',
      text:
        'In a space shaped for soft light and lasting memories, we welcome you to an atmosphere that blends simplicity with luxury.',
      mapBtn: 'Open location in Google Maps',
      placeholder: 'The map awaits your steps',
      placeholderSub: 'Your arrival completes the story.',
    },
    messages: {
      eyebrow: 'From the heart',
      title: 'Leave us a few words',
      desc: 'Share a wish or sketch a warm signature — every gesture is kept with love.',
      nameLabel: 'Your name',
      namePlaceholder: 'e.g. Sara & Omar',
      messageLabel: 'Your message',
      messagePlaceholder: 'Heart to heart… your wishes brighten our day.',
      canvasLabel: 'Signature or sketch (optional)',
      canvasClear: 'Clear pad',
      canvasAria: 'Drawing and signature area',
      canvasHint: 'Draw with finger or stylus — we save your sketch as an image.',
      submit: 'Send message',
    },
    rsvp: {
      eyebrow: 'RSVP',
      title: 'RSVP',
      desc: 'We would love to know if you will join us this evening so we can prepare the warmest welcome.',
      nameLabel: 'Full name',
      namePlaceholder: 'Full name',
      attendLegend: 'Will you attend?',
      yes: 'Yes',
      no: 'No',
      guestCountLabel: 'Number of guests',
      guestCountPlaceholder: '1',
      noteLabel: 'Note (optional)',
      notePlaceholder: 'Dietary needs, seating, or anything we should know',
      submit: 'Submit RSVP',
    },
    footer: {
      line: 'With love beyond words — we await you in an evening shaped like a dream.',
      meta: 'Wedding Invitation · 2026',
    },
    forms: {
      defaultGuestName: 'Honored guest',
      msgEmpty: 'Please write a message before sending.',
      msgSuccess: 'Thank you — your message arrived gently and is saved with our memories.',
      msgError: 'Sending failed temporarily. Please try again or check your connection.',
      rsvpName: 'Please enter your name.',
      rsvpAttend: 'Please choose attendance (yes or no).',
      rsvpCount: 'Guest count must be between 1 and 20.',
      rsvpSuccess: 'We received your RSVP — we cannot wait to welcome you, or we appreciate your kind reply.',
      rsvpError: 'Could not save your RSVP. Please try again later.',
    },
  },
};

export const LANG_ORDER = ['ar', 'en'];

/** @param {'ar' | 'en'} code */
export function isLocale(code) {
  return code === 'ar' || code === 'en';
}
