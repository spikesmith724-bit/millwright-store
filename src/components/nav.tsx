/** The store home is the only tab root in this app. */
export function isTabRoot(pathname: string) {
  return pathname === '/' || pathname === '';
}
