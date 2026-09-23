export class ScenarioRequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readScenarioBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ScenarioRequestError("Ожидается JSON сценария.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new ScenarioRequestError("Слишком большой запрос.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof ScenarioRequestError) throw error;
    throw new ScenarioRequestError("Некорректный JSON сценария.");
  } finally { reader.releaseLock(); }
}
