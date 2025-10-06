// Configuración de MSAL
const msalConfig = {
    auth: {
        clientId: "82d7d86c-af46-4bb4-816d-7c8690a6dc25",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://${window.location.host}/` 
            : "https://jostyn07.github.io/asesoriasPrueba/",
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

// Función para iniciar sesión con Microsoft
async function signInWithMicrosoft() {
    try {
        console.log("🔄 Iniciando sesión con Microsoft...");
        
        // ✅ Verificar si ya hay una sesión activa
        if (checkMicrosoftAuth()) {
            console.log("✅ Ya hay una sesión activa, redirigiendo...");
            window.location.href = 'formulario.html';
            return;
        }

        // ✅ Iniciar login con configuración mejorada
        await msalInstance.loginRedirect({
            ...loginRequest,
            prompt: 'select_account' // Fuerza selección de cuenta
        });
        
    } catch (error) {
        console.error("❌ Error en login de Microsoft:", error);
        
        // ✅ Mostrar error específico al usuario
        let errorMsg = "Error al iniciar sesión con Microsoft.";
        if (error.errorCode === 'user_cancelled') {
            errorMsg = "Login cancelado por el usuario.";
        } else if (error.errorCode === 'consent_required') {
            errorMsg = "Se requiere consentimiento adicional. Por favor, inténtalo de nuevo.";
        } else if (error.errorCode === 'interaction_in_progress') {
            errorMsg = "Ya hay un login en progreso. Espera un momento.";
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
            postLogoutRedirectUri: window.location.origin + '/index.html'
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

// INICIALIZACIÓN ÚNICA Y SIN BUCLES
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await msalInstance.initialize();
        console.log("✅ MSAL inicializado correctamente");

        // Solo manejar resultado del redirect si venimos de Microsoft
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthCode = urlParams.has('code') || window.location.hash.includes('access_token');
        
        if (hasAuthCode) {
            console.log("Detectado redirect de Microsoft, procesando...");
            await handleRedirectResult();
        } else {
            console.log("Carga normal de la página, sin redirect de Microsoft");
        }
    } catch (error) {
        console.error("❌ Error al inicializar MSAL:", error);
    }
});

// ✅ Exportar funciones para uso global
window.signInWithMicrosoft = signInWithMicrosoft;
window.checkMicrosoftAuth = checkMicrosoftAuth;
window.signOutMicrosoft = signOutMicrosoft;
window.getAccessTokenSilently = getAccessTokenSilently; // Para debugging

// ✅ Variables globales para debugging (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.msalInstance = msalInstance;
    window.msalConfig = msalConfig;
    console.log("🔧 Variables MSAL expuestas globalmente para debugging");
}
