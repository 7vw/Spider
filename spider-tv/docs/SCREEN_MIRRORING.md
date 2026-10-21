# مشاركة الشاشة

## الملخص

| الجهاز | الحل | الحالة |
|---|---|---|
| iPhone / iPad | AirPlay Mirroring عبر **UxPlay** | يعمل الآن إذا UxPlay مثبّت (الإعدادات ← مشاركة الشاشة) |
| Mac | AirPlay Mirroring عبر UxPlay (من مركز التحكم ← انعكاس الشاشة) | نفس السابق |
| Android | ما في حل مفتوح المصدر موثوق لـ Miracast أو Google Cast | قيد التقييم (المرحلة 2) |

## AirPlay عبر UxPlay

[UxPlay](https://github.com/FDH2/UxPlay) مستقبل AirPlay مفتوح المصدر (GPLv3) يدعم **AirPlay 2 Mirroring** و **AirPlay Audio**، ولا يدعم وضع «AirPlay Video» (إرسال رابط فيديو من تطبيق مثل Netflix).
يشتغل على Raspberry Pi OS (32 و 64 بت) مع فك ترميز بالعتاد عبر GStreamer v4l2، وعلى macOS ولينكس عمومًا.

التثبيت:

```bash
brew install uxplay            # macOS (للتجربة)
sudo apt install uxplay        # Raspberry Pi OS / Debian / Ubuntu
```

بعدها: الإعدادات ← مشاركة الشاشة ← «تشغيل المستقبل». يظهر التلفزيون في الآيفون باسم `SPIDER TV (اسم الجهاز)`.
خدمة النظام تشغّل `uxplay -n <الاسم> -nh -fs` وتوقفه عند الطلب، وتعرض آخر خطأ إذا فشل.

القيود:

- **التطبيقات المحمية بـ DRM** (Netflix، Disney+، Shahid…) تمنع الانعكاس عمدًا وتظهر شاشة سوداء. هذا قيد من الخدمة نفسها.
- الجهازين لازم على نفس الشبكة، وتحتاج mDNS (Avahi على لينكس، موجود افتراضيًا في Raspberry Pi OS).
- على الماك، macOS نفسه فيه «مستقبل AirPlay» يستخدم نفس المنافذ. للتجربة على الماك أوقفه من إعدادات النظام ← عام ← AirDrop و Handoff ← مستقبل AirPlay.
- التأخير (latency) مقبول للعروض والصور، وأقل مثالية للألعاب.

## Android

- **Miracast**: المشاريع المفتوحة (MiracleCast، OpenWFD) قديمة، وتحتاج إيقاف NetworkManager، والتوافق مع أجهزة أندرويد الحديثة غير مضمون. ما نعتمد عليها كميزة منتج.
- **Google Cast**: المستقبل الرسمي مغلق ويحتاج ترخيص من Google. ما في بديل قانوني مفتوح كامل.
- **الخيارات قيد التقييم للمرحلة 2**:
  - [scrcpy](https://github.com/Genymobile/scrcpy) بوضع Wi-Fi: الجهاز يتصل بالجوال عبر ADB (يحتاج تفعيل Wireless debugging مرة وحدة). يعمل بشكل ممتاز لكنه موجّه للمستخدم المتقدم.
  - تطبيقات أندرويد اللي ترسل بروتوكول AirPlay، فيستقبلها UxPlay.
  - لو اخترنا جهاز Google TV معتمد في المرحلة 3، Google Cast يكون مدمج تلقائيًا.

## المصادر

- [UxPlay على GitHub](https://github.com/FDH2/UxPlay) وسجل الإصدارات (دعم Raspberry Pi و v4l2 وخيار `-pin`).
- نقاش Miracast على لينكس: [Lawrence Systems forum](https://forums.lawrencesystems.com/t/miracast-receiver-sink-for-linux-or-other-os/8639)، [Phoronix](https://www.phoronix.com/news/Intel-Linux-Miracast-Planning).
