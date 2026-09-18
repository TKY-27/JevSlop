import { AppError } from './errors';

export function noteUrl(input: unknown): string {
  if (typeof input !== 'string' || input.length > 2048) throw new AppError('INVALID_URL', '公開されたnote記事のURLを入力してください。');
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new AppError('INVALID_URL', 'URLの形式を確認してください。'); }
  if (url.protocol !== 'https:' || url.hostname !== 'note.com' || url.port || url.username || url.password ||
      !/^\/[a-zA-Z0-9_-]+\/n\/n[a-f0-9]+\/?$/.test(url.pathname)) {
    throw new AppError('INVALID_URL', 'https://note.com/ユーザー名/n/記事ID 形式の記事URLに対応しています。');
  }
  return `https://note.com${url.pathname.replace(/\/$/, '')}`;
}
