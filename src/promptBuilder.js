/**
 * Builds a system prompt by combining a base prompt, character context, and user profile.
 *
 * @param {Object} options
 * @param {string} options.activePromptId - ID of the system prompt to use
 * @param {Array}  options.prompts - Array of prompt objects (from store)
 * @param {Object} options.profile - User profile object (from getProfile)
 * @param {Array}  [options.characters] - Array of character objects to inject
 * @returns {string} Assembled system prompt
 */
export function buildSystemPrompt({ activePromptId, prompts, profile, characters }) {
  let prompt = '';

  if (activePromptId) {
    const p = prompts.find(pr => pr.id === activePromptId);
    if (p) prompt = p.content;
  }

  if (characters && characters.length > 0) {
    for (const character of characters) {
      prompt += '\n\n';
      prompt += `[Character: ${character.name}]\n`;
      if (character.description) prompt += `Description: ${character.description}\n`;
      if (character.traits) prompt += `Personality: ${character.traits}\n`;
      if (character.knowledgeManual) prompt += `Background: ${character.knowledgeManual}\n`;
      if (character.aliases && character.aliases.length > 0) prompt += `Known as: ${character.aliases.join(', ')}\n`;
      prompt += '[/Character]';
    }
  }

  if (profile) {
    const profileParts = [];
    if (profile.name) profileParts.push(`Name: ${profile.name}`);
    if (profile.writingStyle) profileParts.push(`Writing Style: ${profile.writingStyle}`);
    if (profile.preferredGenres) profileParts.push(`Preferred Genres: ${profile.preferredGenres}`);
    if (profile.backgroundNotes) profileParts.push(`Background: ${profile.backgroundNotes}`);
    if (profile.bio) profileParts.push(`Bio: ${profile.bio}`);
    if (profileParts.length > 0) {
      prompt += '\n\n[User Profile]\n' + profileParts.join('\n') + '\n[/User Profile]';
    }
  }

  return prompt;
}
