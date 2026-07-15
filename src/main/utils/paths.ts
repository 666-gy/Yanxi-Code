import { join, normalize } from 'path'
export const nativeJoin = (...seg: string[]) => normalize(join(...seg))
