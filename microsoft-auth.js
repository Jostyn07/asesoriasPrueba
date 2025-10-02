// Configuración de MSAL
const msalConfig = {
    auth: {
        clientId: "82d7d86c-af46-4bb4-816d-7c8690a6dc25", // Reemplaza con tu Client ID de Azure
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

// Inicializar MSAL    
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
        
        // Intentar login silencioso primero
        await msalInstance.loginRedirect(loginRequest);

        let result;
        try {
            result = await msalInstance.acquireTokenSilent(loginRequest);
        } catch (silentError) {
            // Si falla el login silencioso, usar popup
            result = await msalInstance.acquireTokenPopup(loginRequest);
        }

        if (result) {
            console.log("Login exitoso:", result);
            handleMicrosoftSuccess(result);
        }
    } catch (error) {
        console.error("Error en login de Microsoft:", error);
        alert("Error al iniciar sesión con Microsoft. Inténtalo de nuevo.");
    }
}

// Manejar login exitoso
function handleMicrosoftSuccess(result) {
    const account = result.account;
    const userInfo = {
        name: account.name,
        email: account.username,
        provider: 'microsoft',
        accessToken: result.accessToken
    };

    console.log("Usuario autenticado:", userInfo);
    
    // Guardar información del usuario
    sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    sessionStorage.setItem('accessToken', result.accessToken);
    sessionStorage.setItem('authProvider', 'microsoft');
    
    // Redirigir al formulario
    window.location.href = 'formulario.html';
}

// Función para cerrar sesión
async function signOutMicrosoft() {
    try {
        await msalInstance.logoutPopup();
        sessionStorage.clear();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}

// Inicializar MSAL al cargar la página
msalInstance.initialize().then(() => {
    console.log("MSAL inicializado correctamente");
});
