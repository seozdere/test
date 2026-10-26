// TEST DEPLOY ONLY. Do not copy this file into the live deployment.
// Release gate: do not enable until auth definitions and isolated DB tests pass.
// A URL parameter/localStorage flag cannot enable live access.
export const LIVE_ENABLED = true;
export class SpeechExamApi {
  constructor(client, credentials) { this.client = client; this.credentials = credentials; }
  async call(action, payload = {}) {
    if (!LIVE_ENABLED) throw Error('Canlı sınav, güvenlik kurulumu tamamlanana kadar kapalı.');
    const token = this.credentials();
    if (!token) throw Error('Yetkili oturum gerekli.');
    const {data, error} = await this.client.rpc('cl_speech_exam_rpc', {p_token: token, p_action: action, p_payload: payload});
    if (error || !data?.ok) { const e = Error(data?.reason === 'conflict' ? 'Puanlar başka bir oturumda değişti. Bekleyen puanları koruyarak yeniden inceleyin.' : 'İşlem kaydedilemedi veya erişim sona erdi.'); e.code = data?.reason || 'network'; throw e; }
    return data.value;
  }
  list(context) { return this.call('list', context); }
  create(context) { return this.call('create', context); }
  get(id) { return this.call('get', {id}); }
  select(id, studentId, expectedRevision) { return this.call('select', {id, studentId, expectedRevision}); }
  save(id, job) { return this.call('save', {id, ...job}); }
  finish(id, expectedRevision) { return this.call('finish', {id, expectedRevision}); }
  issueBoard(id) { return this.call('issue_board', {id}); }
  revokeBoard(id) { return this.call('revoke_board', {id}); }
  async board() { return this.call('board'); }
  // The topic is a non-secret invalidation address, never an access credential.
  // No tokens, names or scores are sent through Broadcast by this module.
  subscribe(topic, notify, status = () => {}) {
    if (!LIVE_ENABLED) return () => {};
    const channel = this.client.channel(`speech_change_${topic}`)
      .on('broadcast', {event: 'changed'}, () => notify())
      .subscribe(state => { status(state); if (state === 'SUBSCRIBED') notify(); });
    return () => { void this.client.removeChannel(channel); };
  }
}
