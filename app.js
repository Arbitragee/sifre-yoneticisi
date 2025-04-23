// PasswordManager - Tek Parça JS
const dbName = "PasswordManager_v2";
let db;

// 1. VERİTABANI BAĞLANTISI
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 3); // Sürüm 3
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('passwords')) {
                const store = db.createObjectStore("passwords", { 
                    keyPath: "id", 
                    autoIncrement: true 
                });
                store.createIndex("website", "website", { unique: false });
                console.log("🛠️ Veritabanı yapısı güncellendi");
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("✅ Veritabanı bağlantısı başarılı");
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("❌ Veritabanı hatası:", event.target.error);
            reject(event.target.error);
        };
    });
};

// 2. OLAY YÖNETİCİLERİ
const setupEventListeners = () => {
    // Şifre görünürlük butonu
    document.getElementById("togglePassword").addEventListener("click", togglePasswordVisibility);
    
    // Şifre güç göstergesi
    document.getElementById("password").addEventListener("input", updatePasswordStrength);
    
    // Form gönderimi
    document.getElementById("passwordForm").addEventListener("submit", handleFormSubmit);
    
    // Rastgele şifre
    document.getElementById("generatePassword").addEventListener("click", generateRandomPassword);
};

// 3. ŞİFRE GÖSTER/GİZLE
const togglePasswordVisibility = () => {
    const passwordInput = document.getElementById("password");
    const icon = document.querySelector("#togglePassword i");
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        passwordInput.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
};

// 4. ŞİFRE GÜÇ GÖSTERGESİ
const updatePasswordStrength = () => {
    const password = document.getElementById("password").value;
    const strengthBar = document.querySelector(".strength-bar");
    let strength = 0;

    // Güç kuralları
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    // Görsel güncelleme
    const width = strength * 20;
    strengthBar.style.width = `${width}%`;
    strengthBar.style.backgroundColor = 
        strength < 2 ? "#ef233c" : 
        strength < 4 ? "#f8961e" : "#4cc9f0";
};

// 5. FORM İŞLEMLERİ
const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!db) {
        alert("⚠️ Veritabanı bağlantısı yok! Lütfen bekleyin...");
        return;
    }

    const website = document.getElementById("website").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Validasyon
    if (!website || !username || !password) {
        alert("❌ Lütfen tüm alanları doldurun!");
        return;
    }

    try {
        const transaction = db.transaction("passwords", "readwrite");
        const store = transaction.objectStore("passwords");

        await new Promise((resolve, reject) => {
            const request = store.add({ 
                website, 
                username, 
                password,
                createdAt: new Date().toISOString() 
            });

            request.onsuccess = () => {
                console.log("🔐 Şifre kaydedildi:", { website, username });
                showAlert("Şifre başarıyla kaydedildi!", "success");
                resetForm();
                listPasswords();
                resolve();
            };

            request.onerror = (event) => {
                reject(new Error(`Kayıt hatası: ${event.target.error}`));
            };
        });

    } catch (error) {
        console.error("❌ Kaydetme hatası:", error);
        showAlert(`Şifre kaydedilemedi: ${error.message}`, "error");
    }
};

// 6. RASTGELE ŞİFRE ÜRETİCİ
const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";

    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    document.getElementById("password").value = password;
    document.getElementById("password").dispatchEvent(new Event("input"));
    showAlert("Rastgele şifre oluşturuldu!", "success");
};

// 7. ŞİFRE LİSTELEME
const listPasswords = async () => {
    if (!db) {
        console.log("🔄 DB bekleniyor...");
        setTimeout(listPasswords, 100);
        return;
    }

    try {
        const transaction = db.transaction("passwords", "readonly");
        const store = transaction.objectStore("passwords");
        const request = store.getAll();

        request.onsuccess = (event) => {
            const passwords = event.target.result || [];
            const listElement = document.getElementById("passwordList");
            listElement.innerHTML = "";

            if (passwords.length === 0) {
                listElement.innerHTML = `<li class="empty-message">📭 Kayıtlı şifre bulunamadı</li>`;
                return;
            }

            // Tarihe göre sırala (yeni en üstte)
            passwords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            passwords.forEach(password => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <div class="account-info">
                        <strong>${password.website}</strong>
                        <span>${password.username}</span>
                        <span class="password-display">••••••••</span>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-show" title="Göster/Gizle"><i class="fas fa-eye"></i></button>
                        <button class="btn-copy" title="Kopyala"><i class="fas fa-copy"></i></button>
                        <button class="btn-delete" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                li.dataset.id = password.id;

                // Aksiyon butonları
                li.querySelector(".btn-show").addEventListener("click", () => {
                    const display = li.querySelector(".password-display");
                    const icon = li.querySelector(".btn-show i");
                    if (display.textContent === "••••••••") {
                        display.textContent = password.password;
                        icon.classList.replace("fa-eye", "fa-eye-slash");
                    } else {
                        display.textContent = "••••••••";
                        icon.classList.replace("fa-eye-slash", "fa-eye");
                    }
                });

                li.querySelector(".btn-copy").addEventListener("click", () => {
                    navigator.clipboard.writeText(password.password)
                        .then(() => showAlert("Şifre panoya kopyalandı!", "success"))
                        .catch(err => console.error("Kopyalama hatası:", err));
                });

                li.querySelector(".btn-delete").addEventListener("click", () => {
                    if (confirm(`"${password.website}" şifresini silmek istediğinize emin misiniz?`)) {
                        deletePassword(password.id);
                    }
                });

                listElement.appendChild(li);
            });
        };

    } catch (error) {
        console.error("❌ Listeleme hatası:", error);
        showAlert("Şifreler yüklenirken hata oluştu", "error");
    }
};

// 8. ŞİFRE SİLME
const deletePassword = (id) => {
    if (!db) return;

    try {
        const transaction = db.transaction("passwords", "readwrite");
        const store = transaction.objectStore("passwords");
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log("🗑️ Şifre silindi:", id);
            showAlert("Şifre başarıyla silindi", "success");
            listPasswords();
        };

    } catch (error) {
        console.error("❌ Silme hatası:", error);
        showAlert("Şifre silinirken hata oluştu", "error");
    }
};

// 9. FORM TEMİZLEME
const resetForm = () => {
    document.getElementById("website").value = "";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.querySelector(".strength-bar").style.width = "0";
};

// Alert mesajları (YENİ)
const showAlert = (message, type) => {
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const alertBox = document.createElement("div");
    alertBox.className = `alert ${type}`;
    alertBox.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(alertBox);

    // Otomatik kapanma
    setTimeout(() => {
        alertBox.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => alertBox.remove(), 300);
    }, 3000);
};
// 11. UYGULAMA BAŞLATMA
(async () => {
    try {
        await initDB();
        setupEventListeners();
        await listPasswords();
        console.log("🚀 Uygulama başlatıldı");
    } catch (error) {
        console.error("⛔ Uygulama başlatılamadı:", error);
        showAlert("Kritik hata! Lütfen sayfayı yenileyin.", "error");
    }
})();