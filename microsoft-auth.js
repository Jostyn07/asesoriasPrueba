// Configuración de MSAL
const msalConfig = {
    auth: {
        clientId: "82d7d86c-af46-4bb4-816d-7c8690a6dc25", // Reemplaza con tu Client ID de Azure
        authority: "https://login.microsoftonline.com/common",
        redirectUri: "https://jostyn07.github.io" // Asegúrate de que esta URL esté registrada en Azure AD
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
        
        await msalInstance.loginRedirect(loginRequest);

    } catch (error) {
        console.error("Error en login de Microsoft:", error);
        alert("Error al iniciar sesión con Microsoft. Inténtalo de nuevo.");
    }
}

async function handleRedirectResult() {
    try {
        const result = await msalInstance.handleRedirectPromise();

        if (result) {
            console.log("Login exitoso con Microsoft:", result);
            handleMicrosoftSuccess(result);
        }
    } catch (error) {
        console.error("Error al manejar el resultado de redirección:", error);
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
    sessionStorage.setItem('sessionActive', account.name);
    
    // Redirigir al formulario
    window.location.href = 'formulario.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    await msalInstance.initialize();
    console.log("MSAL inicializado correctamente");

    await handleRedirectResult();
});

// funciones para uso global
window.signInWithMicrosoft = signInWithMicrosoft;

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
