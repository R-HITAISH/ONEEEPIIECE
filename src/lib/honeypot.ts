export function isSimpleBotSubmission(form: HTMLFormElement, startedAt: number): boolean {
  const website = new FormData(form).get('website');
  return (typeof website === 'string' && website.trim().length > 0) || Date.now() - startedAt < 3000;
}
