/**
 * The verbatim content of MSSP_Ticket_Agent_Instructions.md, embedded at build time.
 *
 * IMPORTANT: This constant must always exactly match MSSP_Ticket_Agent_Instructions.md.
 * A dedicated unit test (agentInstructions.test.ts) enforces this constraint.
 *
 * The `?raw` Vite suffix imports the file as a plain string at build time,
 * ensuring zero runtime file I/O and compatibility with the renderer process.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Vite ?raw import; TypeScript sees this as a module with no types.
// The vite-env.d.ts declares this import pattern globally.
import rawInstructions from '../../../MSSP_Ticket_Agent_Instructions.md?raw';

export const AGENT_INSTRUCTIONS: string = rawInstructions as string;

export default AGENT_INSTRUCTIONS;
