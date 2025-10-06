// Configuración de MSAL
const msalConfig = {
    auth: {
        clientId: "82d7d86c-af46-4bb4-816d-7c8690a6dc25",
        authority: "https://login.microsoftonline.com/0d552b47-ae76-4660-9895-59df53271360",
        redirectUri: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://${window.location.host}/` 
            : "https://jostyn07.github.io/asesoriasPrueba/",
    },
    cache: {
        cacheLocation: "localStorage", // ✅ Cambiar a localStorage para persistencia
        storeAuthStateInCookie: true   // ✅ Importante para GitHub Pages
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
        console.log("Iniciando sesión con Microsoft...");
        await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
        console.error("Error en login de Microsoft:", error);
        alert("Error al iniciar sesión con Microsoft. Inténtalo de nuevo.");
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

// Verificar si hay una sesión activa de Microsoft (SIN causar bucles)
function checkMicrosoftAuth() {
    try {
        const sessionActive = localStorage.getItem('sessionActive');
        const authProvider = localStorage.getItem('authProvider');
        const userName = localStorage.getItem('userName');
        
        // Verificación simple basada en localStorage (más estable)
        if (sessionActive === 'true' && authProvider === 'microsoft' && userName) {
            console.log("✅ Sesión de Microsoft válida para:", userName);
            return true;
        }
        
        console.log("❌ No hay sesión válida de Microsoft en localStorage");
        return false;
    } catch (error) {
        console.error("Error verificando Microsoft Auth:", error);
        return false;
    }
}

// Función eliminada para evitar bucles de redirección

// Función para cerrar sesión de Microsoft
async function signOutMicrosoft() {
    try {
        await msalInstance.logoutRedirect();
        localStorage.clear();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        localStorage.clear();
        window.location.href = 'index.html';
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

// Exportar funciones para uso global
window.signInWithMicrosoft = signInWithMicrosoft;
window.checkMicrosoftAuth = checkMicrosoftAuth;
window.signOutMicrosoft = signOutMicrosoft;