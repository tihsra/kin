export type SignupChallenge = {
  challengeId: string;
  email: string;
  expiresAt: string;
  resendAt: string;
};
const key = 'kin-signup';
export function rememberSignup(challenge: SignupChallenge) {
  sessionStorage.setItem(key, JSON.stringify(challenge));
}
export function readSignup(): SignupChallenge | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    return value?.challengeId && value?.email && value?.expiresAt && value?.resendAt ? value : null;
  } catch {
    return null;
  }
}
export function clearSignup() {
  sessionStorage.removeItem(key);
}
