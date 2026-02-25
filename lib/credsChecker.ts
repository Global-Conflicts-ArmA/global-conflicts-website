import { CREDENTIAL } from "../middleware/check_auth_perms";

export default function hasCreds(session, cred: CREDENTIAL): boolean {
    if (!session?.user?.roles) {
        return false;
    }

    const userRoles: string[] = session.user.roles.map(role => role.name);

    // Admins have all credentials
    if (userRoles.includes(CREDENTIAL.ADMIN)) {
        return true;
    }

    return userRoles.includes(cred);
}

export function hasCredsAny(session, credList: Array<CREDENTIAL>): boolean {
    if (!session?.user?.roles) {
        return false;
    }

    if (credList.includes(CREDENTIAL.ANY)) {
        return true;
    }

    const userRoles: string[] = session.user.roles.map(role => role.name);

    // Admins have all credentials
    if (userRoles.includes(CREDENTIAL.ADMIN)) {
        return true;
    }

    return credList.some(cred => userRoles.includes(cred));
}
