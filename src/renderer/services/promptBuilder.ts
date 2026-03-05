import type { AlertData } from '../types/alert.types';
import type { BuiltPrompt } from '../types/provider.types';
import { AGENT_INSTRUCTIONS } from '../constants/agentInstructions';

/**
 * Prompt builder — constructs the full API prompt from alert data.
 *
 * Per spec §10:
 * - System prompt = verbatim MSSP agent instructions (no modification)
 * - User message = structured alert data block with only provided fields
 */

type IpType = 'PRIVATE' | 'PUBLIC';

function getIpType(isPublic: boolean): IpType {
  return isPublic ? 'PUBLIC' : 'PRIVATE';
}

/**
 * Build the user message from alert data.
 * Only includes fields with non-empty values.
 */
export function buildUserMessage(data: AlertData): string {
  const lines: string[] = [
    'You are completing a ticket for the following security alert. Use the instructions above to fill in the ticket template as completely as the provided data allows.',
    '',
    'ALERT DATA:',
    '---',
  ];

  if (data.timestamp.trim()) {
    lines.push(`Time: ${data.timestamp.trim()}`);
  }

  if (data.alert_category.trim()) {
    lines.push(`alert.category: ${data.alert_category.trim()}`);
  }

  if (data.alert_signature.trim()) {
    lines.push(`alert.signature: ${data.alert_signature.trim()}`);
  }

  if (data.src_ip.trim()) {
    const ipType = getIpType(data.src_ip_is_public);
    lines.push(`src_ip: ${data.src_ip.trim()} [${ipType}]`);
  }

  if (data.src_port.trim()) {
    lines.push(`src_port: ${data.src_port.trim()}`);
  }

  if (data.dest_ip.trim()) {
    const ipType = getIpType(data.dest_ip_is_public);
    lines.push(`dest_ip: ${data.dest_ip.trim()} [${ipType}]`);
  }

  if (data.dest_port.trim()) {
    lines.push(`dest_port: ${data.dest_port.trim()}`);
  }

  if (data.proto.trim()) {
    lines.push(`proto: ${data.proto.trim()}`);
  }

  if (data.app_proto.trim()) {
    lines.push(`app_proto: ${data.app_proto.trim()}`);
  }

  if (data.reported_by.trim()) {
    lines.push(
      `Reported by (analyst name — use this value in the "Reported by" field exactly as provided): ${data.reported_by.trim()}`,
    );
  }

  lines.push('---');
  lines.push('');
  lines.push(
    'Where [PRIVATE] or [PUBLIC] appears after an IP address, this indicates the IP classification as determined by the application before sending to you. Use this classification directly.',
  );
  lines.push('');
  lines.push(
    'Generate the completed ticket now. Output only the ticket text — no preamble, no explanation, no markdown formatting around the ticket content.',
  );

  return lines.join('\n');
}

/**
 * Build the complete prompt (system + user message) for an API call.
 * The system prompt is always the verbatim MSSP agent instructions.
 */
export function buildPrompt(data: AlertData): BuiltPrompt {
  return {
    systemPrompt: AGENT_INSTRUCTIONS,
    userMessage: buildUserMessage(data),
  };
}

/**
 * Build a revision prompt for revising a specific section of an existing ticket.
 * Used by the AI revision feature when the analyst selects a section and provides
 * an instruction for how to improve it.
 */
export function buildRevisionPrompt(selectedText: string, instruction: string): BuiltPrompt {
  return {
    systemPrompt: AGENT_INSTRUCTIONS,
    userMessage: [
      'You are revising a specific section of an incident ticket.',
      '',
      'Original section:',
      '---',
      selectedText,
      '---',
      '',
      `Revision instruction: ${instruction}`,
      '',
      'Return ONLY the revised text for this section. Preserve the plain-text formatting style — no markdown, no preamble, no surrounding commentary.',
    ].join('\n'),
  };
}
