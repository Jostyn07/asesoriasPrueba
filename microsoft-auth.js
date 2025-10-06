// ======================== Funciones de Utilidad ========================
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (document.body.contains(messageDiv)) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
}

// Configuración de MSAL
const msalConfig = {
    auth: {
        clientId: "82d7d86c-af46-4bb4-816d-7c8690a6dc25",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: "https://jostyn07.github.io/asesoriasPrueba/",
    },
    cache: {
        cacheLocation: "localStorage", // ✅ Cambiar a localStorage para persistencia
        storeAuthStateInCookie: true   // ✅ Importante para GitHub Pages
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                if (!containsPii) {
                    console.log(`[MSAL ${loglevel}]: ${message}`);
                }
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Info
        }
    }
};

// Inicializar MSAL UNA SOLA VEZ
const msalInstance = new msal.PublicClientApplication(msalConfig);

// Configuración de la solicitud de login
const loginRequest = {
    scopes: ["openid", "profile", "User.Read"],
    prompt: "select_account"
};

// Función para iniciar sesión con Microsoft (CORREGIDA)
async function signInWithMicrosoft() {
    try {
        console.log("🔄 Iniciando sesión con Microsoft...");
        
        // ✅ Verificar si ya hay una sesión activa
        if (checkMicrosoftAuth()) {
            console.log("✅ Ya hay una sesión activa, redirigiendo...");
            window.location.href = 'formulario.html';
            return;
        }

        // ✅ NUEVO: Verificar si hay interacción en progreso
        const inProgress = msalInstance.getActiveAccount();
        if (inProgress) {
            console.log("⚠️ Ya hay una interacción en progreso");
            return;
        }

        // ✅ NUEVO: Limpiar cualquier interacción pendiente
        try {
            await msalInstance.handleRedirectPromise();
        } catch (e) {
            console.log("Limpiando interacción previa...");
        }

        // ✅ Iniciar login
        await msalInstance.loginRedirect(loginRequest);
        
    } catch (error) {
        console.error("❌ Error en login de Microsoft:", error);
        
        // ✅ Manejo específico del error interaction_in_progress
        if (error.errorCode === 'interaction_in_progress') {
            console.log("🔄 Hay una interacción en progreso, esperando...");
            
            // Intentar manejar el resultado pendiente
            setTimeout(async () => {
                try {
                    await handleRedirectResult();
                } catch (e) {
                    console.log("No hay resultado pendiente para manejar");
                }
            }, 1000);
            return;
        }
        
        let errorMsg = "Error al iniciar sesión con Microsoft.";
        if (error.errorCode === 'user_cancelled') {
            errorMsg = "Login cancelado por el usuario.";
        } else if (error.errorCode === 'consent_required') {
            errorMsg = "Se requiere consentimiento adicional. Por favor, inténtalo de nuevo.";
        }
        
        alert(errorMsg);
    }
}

// Manejar el resultado del redirect
async function handleRedirectResult() {
    try {
        // Evitar procesar múltiples veces el mismo resultado
        if (window.isProcessingRedirect) {
            console.log("Ya procesando resultado de redirect, omitiendo...");
            return;
        }
        
        window.isProcessingRedirect = true;
        const result = await msalInstance.handleRedirectPromise();

        if (result && result.account) {
            console.log("Login exitoso con Microsoft:", result.account.name);
            handleMicrosoftSuccess(result);
        } else {
            console.log("No hay resultado de redirect para procesar");
        }
    } catch (error) {
        console.error("Error al manejar el resultado de redirección:", error);
    } finally {
        window.isProcessingRedirect = false;
    }
}

// Manejar login exitoso
function handleMicrosoftSuccess(result) {
    // Evitar procesamiento múltiple
    if (window.isRedirectingToForm) {
        console.log("Ya redirigiendo al formulario, omitiendo...");
        return;
    }
    
    const account = result.account;
    const userInfo = {
        name: account.name,
        email: account.username,
        provider: 'microsoft',
        accessToken: result.accessToken || null
    };

    console.log("Guardando datos de usuario autenticado:", account.name);
    
    // Guardar información del usuario en localStorage
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken);
    }
    localStorage.setItem('authProvider', 'microsoft');
    localStorage.setItem('sessionActive', 'true');
    localStorage.setItem('userName', account.name);
    
    // Redirigir al formulario solo una vez
    window.isRedirectingToForm = true;
    console.log("Redirigiendo a formulario.html...");
    window.location.href = 'formulario.html';
}

// Verificar si hay una sesión activa de Microsoft (CON verificación dual)
function checkMicrosoftAuth() {
    try {
        // ✅ Verificar localStorage primero (más rápido)
        const authProvider = localStorage.getItem('authProvider');
        const sessionActive = localStorage.getItem('sessionActive');
        const userName = localStorage.getItem('userName');
        
        if (authProvider === 'microsoft' && sessionActive === 'true' && userName) {
            console.log("✅ Sesión Microsoft válida en localStorage para:", userName);
            return true;
        }

        // ✅ Verificar cuentas MSAL como fallback (sin causar bucles)
        const accounts = msalInstance.getAllAccounts();
        if (accounts && accounts.length > 0) {
            const account = accounts[0];
            console.log("✅ Cuenta Microsoft encontrada en MSAL:", account.name);
            
            // Sincronizar con localStorage si falta
            if (authProvider !== 'microsoft') {
                console.log("🔄 Sincronizando datos de cuenta con localStorage");
                localStorage.setItem('authProvider', 'microsoft');
                localStorage.setItem('sessionActive', 'true');
                localStorage.setItem('userName', account.name);
                localStorage.setItem('userInfo', JSON.stringify({
                    name: account.name,
                    email: account.username,
                    provider: 'microsoft'
                }));
            }
            return true;
        }

        console.log("❌ No se encontró sesión Microsoft válida");
        return false;
        
    } catch (error) {
        console.error("Error al verificar autenticación Microsoft:", error);
        return false;
    }
}

// Función eliminada para evitar bucles de redirección

// Función para cerrar sesión de Microsoft (mejorada)
async function signOutMicrosoft() {
    try {
        console.log("🔄 Cerrando sesión Microsoft...");
        
        // ✅ Limpiar localStorage específico de Microsoft
        localStorage.removeItem('authProvider');
        localStorage.removeItem('sessionActive'); 
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userName');
        localStorage.removeItem('accessToken');
        
        // ✅ Limpiar cache MSAL
        await msalInstance.clearCache();
        
        // ✅ Logout con redirect
        await msalInstance.logoutRedirect({
            postLogoutRedirectUri: window.location.origin + '/formulario.html'
        });
        
    } catch (error) {
        console.error("❌ Error al cerrar sesión:", error);
        
        // ✅ Fallback: limpiar y redirigir manualmente
        localStorage.removeItem('authProvider');
        localStorage.removeItem('sessionActive'); 
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userName');
        localStorage.removeItem('accessToken');
        
        window.location.href = 'index.html';
    }
}

// ✅ Función para obtener token de acceso silenciosamente (para debugging)
async function getAccessTokenSilently() {
    try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
            console.log("⚠️ No hay cuentas disponibles para obtener token");
            return null;
        }

        const silentRequest = {
            scopes: ["User.Read"],
            account: accounts[0]
        };

        const response = await msalInstance.acquireTokenSilent(silentRequest);
        console.log("✅ Token obtenido silenciosamente");
        return response.accessToken;
        
    } catch (error) {
        console.log("⚠️ No se pudo obtener token silenciosamente:", error.message);
        return null;
    }
}

// ✅ NUEVA: Función para limpiar estado problemático
async function clearMSALState() {
    try {
        console.log("🧹 Limpiando estado MSAL...");
        
        // Limpiar cache
        await msalInstance.clearCache();
        
        // Limpiar flags globales
        window.isProcessingRedirect = false;
        window.isRedirectingToForm = false;
        
        // Limpiar localStorage relacionado
        localStorage.removeItem('authProvider');
        localStorage.removeItem('sessionActive');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userName');
        localStorage.removeItem('accessToken');
        
        console.log("✅ Estado MSAL limpiado");
        
    } catch (error) {
        console.error("Error al limpiar estado MSAL:", error);
    }
}

// Función para cerrar sesión
function signOut() {
    clearAllAuthData();
    showMessage("Sesión cerrada exitosamente", "success");
    
    setTimeout(() => {
        window.location.href = "./index.html";
    }, 1000);
}

// Limpiar todos los datos de autenticación
function clearAllAuthData() {
    localStorage.removeItem('authProvider');
    localStorage.removeItem('sessionActive');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userName');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_user_info');
    localStorage.removeItem('google_refresh_token');
    localStorage.removeItem('token_expiry_time');
    localStorage.removeItem('session_start_time');
}

// Verificar si hay una sesión activa existente (MEJORADA)
function checkExistingAuth() {
    const authProvider = localStorage.getItem('authProvider');
    const sessionActive = localStorage.getItem('sessionActive');
    const userName = localStorage.getItem('userName');
    
    // Verificación completa igual que checkMicrosoftAuth
    return authProvider === 'microsoft' && sessionActive === 'true' && userName;
}

// NUEVA: Función para obtener la página actual
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page.toLowerCase();
}

// NUEVA: Verificar si debe redirigir
function shouldRedirectToForm() {
    const currentPage = getCurrentPage();
    const hasAuth = checkExistingAuth();
    
    // Solo redirigir si está en index.html y tiene autenticación
    return hasAuth && (currentPage === 'index.html' || currentPage === '');
}

// NUEVA: Verificar si debe redirigir al login
function shouldRedirectToLogin() {
    const currentPage = getCurrentPage();
    const hasAuth = checkExistingAuth();
    
    // Solo redirigir si está en formulario.html y NO tiene autenticación
    return !hasAuth && currentPage === 'formulario.html';
}

// INICIALIZACIÓN MEJORADA SIN BUCLES DE REDIRECCIÓN
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await msalInstance.initialize();
        console.log("✅ MSAL inicializado correctamente");
        console.log("📍 Página actual:", getCurrentPage());

        // ✅ NUEVO: Verificar si debe redirigir al login (para formulario.html sin auth)
        if (shouldRedirectToLogin()) {
            console.log("❌ Sin autenticación en formulario, redirigiendo al login...");
            showMessage("Debes iniciar sesión para acceder al formulario", "error");
            setTimeout(() => {
                window.location.href = "./index.html";
            }, 1500);
            return;
        }

        // ✅ NUEVO: Solo redirigir al formulario si estamos en index.html CON autenticación
        if (shouldRedirectToForm()) {
            console.log("✅ Sesión activa en index.html, redirigiendo al formulario...");
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            showMessage(`Bienvenido de nuevo, ${userInfo.name}!`, "success");
            setTimeout(() => {
                window.location.href = "./formulario.html";
            }, 1000);
            return;
        }

        // ✅ Si ya estamos en la página correcta, no redirigir
        const currentPage = getCurrentPage();
        if (currentPage === 'formulario.html' && checkExistingAuth()) {
            console.log("✅ Ya en formulario.html con autenticación válida");
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            console.log("Usuario autenticado:", userInfo.name);
            return; // No hacer nada más
        }

        // ✅ Manejar redirects de Microsoft solo si hay parámetros de auth
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthCode = urlParams.has('code') || window.location.hash.includes('access_token');
        
        if (hasAuthCode) {
            console.log("🔄 Detectado redirect de Microsoft, procesando...");
            await handleRedirectResult();
        } else {
            console.log("📄 Carga normal de la página");
            
            // Verificar cuentas existentes sin redirigir automáticamente
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                console.log("� Cuenta MSAL encontrada:", accounts[0].name);
                
                // Sincronizar con localStorage si no coincide
                if (!checkExistingAuth()) {
                    console.log("🔄 Sincronizando datos de sesión...");
                    localStorage.setItem('authProvider', 'microsoft');
                    localStorage.setItem('sessionActive', 'true');
                    localStorage.setItem('userName', accounts[0].name);
                    localStorage.setItem('userInfo', JSON.stringify({
                        name: accounts[0].name,
                        email: accounts[0].username,
                        provider: 'microsoft'
                    }));
                }
            }
        }
        
        // Limpiar flags globales
        window.isProcessingRedirect = false;
        window.isRedirectingToForm = false;

        // Configurar event listeners solo en index.html
        if (currentPage === 'index.html' || currentPage === '') {
            const outlookBtn = document.getElementById('outlookSignInBtn');
            if (outlookBtn) {
                outlookBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    signInWithMicrosoft();
                });
            }
        }
        
    } catch (error) {
        console.error("❌ Error al inicializar MSAL:", error);
        showMessage("Error al iniciar sistema de autenticación.", 'error');
    }
});

// ✅ Exportar funciones para uso global
window.signInWithMicrosoft = signInWithMicrosoft;
window.checkMicrosoftAuth = checkMicrosoftAuth;
window.signOutMicrosoft = signOutMicrosoft;
window.getAccessTokenSilently = getAccessTokenSilently; // Para debugging
window.clearMSALState = clearMSALState; // Para limpiar estado problemático
window.signOut = signOut; // Para compatibilidad con formulario.js
window.checkExistingAuth = checkExistingAuth; // Para compatibilidad con formulario.js

// ✅ Variables globales para debugging (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.msalInstance = msalInstance;
    window.msalConfig = msalConfig;
    console.log("🔧 Variables MSAL expuestas globalmente para debugging");
}

// 🔍 Debugging de estado actual
console.log("🔍 Estado actual:");
console.log("- Página:", getCurrentPage ? getCurrentPage() : window.location.pathname);
console.log("- Auth Provider:", localStorage.getItem('authProvider'));
console.log("- Session Active:", localStorage.getItem('sessionActive'));
console.log("- User Name:", localStorage.getItem('userName'));
