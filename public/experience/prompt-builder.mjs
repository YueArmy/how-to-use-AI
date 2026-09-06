export const LENS_LABELS = Object.freeze({ method: '01 / やり方', combine: '02 / 組み合わせ', cases: '03 / 事例' });
const QUESTIONS = Object.freeze({
  method: 'この目的を達成するために、効果的な方法を一緒に考えてください。まず、作業自体のやり方や、必要な情報を整理したいです。分からないところは、確認しながら進めてください。',
  combine: 'この目的を達成するには、どんなツールや手段を使い、どのような流れにするとよいでしょうか。工程を分け、人が判断するところとAIに任せるところを整理してください。小さく試せる進め方も知りたいです。',
  cases: '同じような目的で実際に取り組んだ人の事例を調べてください。どのような手順で、何を使ったのか。うまくいかなかった点や、途中で変えたところも知りたいです。元の情報を確認できる出典を示し、確認できない点はそのように伝えてください。'
});
export function buildConsultation({ task = '', goal = '', lens = 'method' } = {}) {
  const selected = Object.hasOwn(LENS_LABELS, lens) ? lens : 'method';
  const work = String(task).trim() || '［今、やっている作業］';
  const purpose = String(goal).trim() || '［その作業で、達成したいこと］';
  return {
    lens: selected,
    label: LENS_LABELS[selected],
    text: `今取り組んでいる作業：${work}\n達成したいこと：${purpose}\n\n${QUESTIONS[selected]}`
  };
}
