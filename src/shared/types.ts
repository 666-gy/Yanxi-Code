export type WindowAction = 'minimize' | 'maximize-toggle' | 'close'
export interface WindowApi {
  minimize: () => void
  maximizeToggle: () => void
  close: () => void
  onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
}
