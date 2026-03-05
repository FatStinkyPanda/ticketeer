import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AGENT_INSTRUCTIONS } from './agentInstructions';

/**
 * Critical test: AGENT_INSTRUCTIONS must exactly match the source-of-truth file.
 * The two must always be identical. If they diverge, the AI agent will receive
 * wrong or outdated instructions.
 */
describe('agentInstructions', () => {
  it('AGENT_INSTRUCTIONS exactly matches MSSP_Ticket_Agent_Instructions.md', () => {
    const filePath = resolve(
      __dirname,
      '../../../MSSP_Ticket_Agent_Instructions.md',
    );
    const fileContent = readFileSync(filePath, 'utf-8');
    expect(AGENT_INSTRUCTIONS).toBe(fileContent);
  });

  it('AGENT_INSTRUCTIONS is not empty', () => {
    expect(AGENT_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  it('AGENT_INSTRUCTIONS contains key behavioral rules', () => {
    expect(AGENT_INSTRUCTIONS).toContain('Never fabricate data');
    expect(AGENT_INSTRUCTIONS).toContain('analyst name');
    expect(AGENT_INSTRUCTIONS).toContain('[Customer Name Here]');
  });

  it('AGENT_INSTRUCTIONS contains the ticket template', () => {
    expect(AGENT_INSTRUCTIONS).toContain('MSSP INCIDENT TICKET');
    expect(AGENT_INSTRUCTIONS).toContain('SECTION 1');
    expect(AGENT_INSTRUCTIONS).toContain('SECTION 7');
  });
});
