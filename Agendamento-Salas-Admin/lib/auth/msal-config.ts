import { Configuration, LogLevel } from "@azure/msal-browser"

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "common"}`,
    redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ?? "http://localhost:3001",
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ?? "http://localhost:3001",
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level, message) => {
        console.warn("[MSAL]", message)
      },
    },
  },
}

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
}
