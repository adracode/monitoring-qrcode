import { TokenManager } from "../services/token";

export function getAuthCookie(headerCookie: string | undefined): { hasAuthCookie: boolean, authCookie: string } {
    const cookies = headerCookie?.trim().split(';')
    for(const cookie of cookies ?? []) {
        const tmp = cookie.trim().split('=');
        const cookieName = tmp[0].trim();
        const cookieValue = tmp[1].trim();
        if(cookieName === "authToken" && TokenManager.getInstance().isValid(cookieValue)) {
            return { hasAuthCookie: true, authCookie: cookieValue };
        }
    }
    return { hasAuthCookie: false, authCookie: "" };
}
