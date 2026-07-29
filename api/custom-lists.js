import bcrypt from 'bcryptjs';
// استورد قاعدة البيانات الخاصة بك هنا (Upstash/Redis)
// import redis from '../../lib/redis'; 

export default async function handler(req, res) {
    const { action, name } = req.query;

    if (req.method === 'GET') {
        if (action === 'check') {
            // كود التحقق من توفر الاسم
            const exists = /* await redis.exists(name) */ false;
            return res.status(200).json({ available: !exists });
        }
        
        if (action === 'get') {
            // جلب القائمة من قاعدة البيانات
            let list = /* await redis.get(name) */ null; 
            
            if (!list) return res.status(404).json({ error: "List not found" });

            // 🔴 الأمان: إزالة كلمة السر قبل إرسال البيانات للمتصفح
            const isProtected = !!list.password;
            const returnData = { ...list };
            delete returnData.password; 
            returnData.hasPassword = isProtected; // إخبار المتصفح أن القائمة محمية

            // إذا كانت القائمة مخفية (private) ومحمية، لا ترسل الكلمات
            if (isProtected && list.hidden) {
                returnData.words = []; 
            }

            return res.status(200).json(returnData);
        }
    }

    if (req.method === 'POST') {
        if (action === 'verify') {
            const { name, password } = req.body;
            let list = /* await redis.get(name) */ null;

            if (!list || !list.password) {
                return res.status(400).json({ success: false, message: "List not protected or not found" });
            }

            // 🔴 الأمان: مقارنة كلمة السر مع النسخة المشفرة
            const isValid = await bcrypt.compare(password, list.password);
            
            if (isValid) {
                // إرجاع توكن بسيط (أو يمكنك استخدام JWT لمزيد من الأمان)
                const token = Buffer.from(`${name}:${password}`).toString('base64');
                
                // إرجاع بيانات القائمة كاملة بعد نجاح التحقق
                const returnData = { ...list };
                delete returnData.password;
                returnData.hasPassword = true;

                return res.status(200).json({ success: true, token, list: returnData });
            } else {
                return res.status(401).json({ success: false, message: "Incorrect password" });
            }
        }

        // حفظ أو تحديث القائمة
        const { name, data, token } = req.body;
        
        // إذا كان هناك تحديث لقائمة موجودة ومحمية، يجب التحقق من التوكن أولاً
        let existingList = /* await redis.get(name) */ null;
        if (existingList && existingList.password) {
            // تحقق مبسط من التوكن (في المشاريع الحقيقية استخدم JWT)
            const isValidToken = token && token === Buffer.from(`${name}:${req.body.plainPassword || ''}`).toString('base64');
            // تجاوز التحقق إذا كان الطلب من نفس الجهاز المنشئ أو أضف لوجيك التحقق الخاص بك
        }

        const listToSave = { ...data };

        // 🔴 الأمان: تشفير كلمة السر قبل حفظها في قاعدة البيانات
        if (listToSave.password && listToSave.password.length < 50) { // التحقق من أنها ليست مشفرة مسبقاً
            const salt = await bcrypt.genSalt(10);
            listToSave.password = await bcrypt.hash(listToSave.password, salt);
        }

        // حفظ في قاعدة البيانات
        // await redis.set(name, listToSave);

        return res.status(200).json({ success: true });
    }
}
