const { maybeHandleOptions, methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http');
const { getForumAuthFromRequest } = require('../../lib/forumAuth');
const { recordQuizAnswerProgress } = require('../../lib/db');

const ALLOWED_RESULT_TYPES = new Set(['correct', 'partial', 'incorrect']);

function sanitizeProgressPayload(input) {
  const questionId = String(input.questionId || '').trim().slice(0, 80);
  const resultType = String(input.resultType || '').trim().toLowerCase();

  if (!questionId) {
    throw new Error('Küsimuse identifikaator puudub.');
  }

  if (!ALLOWED_RESULT_TYPES.has(resultType)) {
    throw new Error('Vigane vastuse tulemus.');
  }

  return {
    questionId,
    resultType,
    selectedCount: Math.max(0, Number(input.selectedCount) || 0),
    selectedCorrectCount: Math.max(0, Number(input.selectedCorrectCount) || 0),
    missedCorrectCount: Math.max(0, Number(input.missedCorrectCount) || 0),
    incorrectSelectedCount: Math.max(0, Number(input.incorrectSelectedCount) || 0)
  };
}

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST', 'OPTIONS']);
  }

  const user = getForumAuthFromRequest(req);
  if (!user) {
    return sendJson(req, res, 401, {
      ok: false,
      error: 'Sessioon puudub või on aegunud.'
    });
  }

  try {
    const body = await readJsonBody(req);
    const payload = sanitizeProgressPayload(body);

    const quizStats = await recordQuizAnswerProgress({
      googleSub: user.sub,
      email: user.email,
      displayName: user.name,
      ...payload
    });

    return sendJson(req, res, 200, {
      ok: true,
      quizStats
    });
  } catch (error) {
    console.error('Quiz progress error:', error);

    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Vastuse edenemist ei õnnestunud salvestada.'
    });
  }
};
