import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyField } from './ApiKeyField';

describe('ApiKeyField', () => {
  const onSave = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    onSave.mockClear();
    onDelete.mockClear();
  });

  describe('when no key is saved', () => {
    it('renders the API key input field', () => {
      render(<ApiKeyField provider="anthropic" value={null} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByLabelText(/Anthropic Claude API key input/i)).toBeInTheDocument();
    });

    it('renders the Save button', () => {
      render(<ApiKeyField provider="anthropic" value={null} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByRole('button', { name: /Save Anthropic/i })).toBeInTheDocument();
    });

    it('Save button is disabled when input is empty', () => {
      render(<ApiKeyField provider="anthropic" value={null} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByRole('button', { name: /Save Anthropic/i })).toBeDisabled();
    });

    it('calls onSave with valid Anthropic key', async () => {
      render(<ApiKeyField provider="anthropic" value={null} onSave={onSave} onDelete={onDelete} />);
      const input = screen.getByLabelText(/Anthropic Claude API key input/i);
      await userEvent.type(input, 'sk-ant-api03-testkeytestkeytestkey1234567890');
      fireEvent.click(screen.getByRole('button', { name: /Save Anthropic/i }));
      expect(onSave).toHaveBeenCalledWith('sk-ant-api03-testkeytestkeytestkey1234567890');
    });

    it('shows invalid validation message for wrong key format', async () => {
      render(<ApiKeyField provider="anthropic" value={null} onSave={onSave} onDelete={onDelete} />);
      await userEvent.type(screen.getByLabelText(/Anthropic Claude API key input/i), 'invalid-key');
      fireEvent.click(screen.getByRole('button', { name: /Save Anthropic/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i);
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave with valid OpenRouter key', async () => {
      render(<ApiKeyField provider="openrouter" value={null} onSave={onSave} onDelete={onDelete} />);
      const input = screen.getByLabelText(/OpenRouter API key input/i);
      await userEvent.type(input, 'sk-or-v1-testkeytestkeytestkey1234567890');
      fireEvent.click(screen.getByRole('button', { name: /Save OpenRouter/i }));
      expect(onSave).toHaveBeenCalled();
    });

    it('calls onSave with valid Gemini key (length > 10, no prefix required)', async () => {
      render(<ApiKeyField provider="gemini" value={null} onSave={onSave} onDelete={onDelete} />);
      const input = screen.getByLabelText(/Google Gemini API key input/i);
      await userEvent.type(input, 'AIzaSyTestKey12345');
      fireEvent.click(screen.getByRole('button', { name: /Save Google Gemini/i }));
      expect(onSave).toHaveBeenCalledWith('AIzaSyTestKey12345');
    });

    it('shows invalid message without prefix hint for Gemini key that is too short', async () => {
      render(<ApiKeyField provider="gemini" value={null} onSave={onSave} onDelete={onDelete} />);
      await userEvent.type(screen.getByLabelText(/Google Gemini API key input/i), 'short');
      fireEvent.click(screen.getByRole('button', { name: /Save Google Gemini/i }));
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/invalid/i);
      expect(alert).not.toHaveTextContent(/Expected to start with/);
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('when key is already saved', () => {
    const savedKey = 'sk-ant-api03-testkeytestkeytestkey123';

    it('shows only bullet dots when saved key is 8 chars or shorter', () => {
      render(<ApiKeyField provider="anthropic" value="tiny" onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByText('••••••••')).toBeInTheDocument();
    });

    it('shows masked key display', () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByText(/••••••••/)).toBeInTheDocument();
    });

    it('shows last 4 chars of key in masked display', () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByText(/•+\d{4}|•+[a-z0-9]{4}/i)).toBeInTheDocument();
    });

    it('renders reveal button', () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByRole('button', { name: /Reveal API key/i })).toBeInTheDocument();
    });

    it('reveal button toggles key visibility', async () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      await userEvent.click(screen.getByRole('button', { name: /Reveal API key/i }));
      expect(screen.getByText(savedKey)).toBeInTheDocument();
    });

    it('renders delete button', () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      expect(screen.getByRole('button', { name: /Delete.*API key/i })).toBeInTheDocument();
    });

    it('shows confirmation before deleting', async () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      await userEvent.click(screen.getByRole('button', { name: /Delete.*API key/i }));
      expect(screen.getByText(/Permanently delete this key/i)).toBeInTheDocument();
    });

    it('calls onDelete after confirmation', async () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      await userEvent.click(screen.getByRole('button', { name: /Delete.*API key/i }));
      await userEvent.click(screen.getByRole('button', { name: /Yes, delete/i }));
      expect(onDelete).toHaveBeenCalledOnce();
    });

    it('cancels deletion when cancel is clicked', async () => {
      render(<ApiKeyField provider="anthropic" value={savedKey} onSave={onSave} onDelete={onDelete} />);
      await userEvent.click(screen.getByRole('button', { name: /Delete.*API key/i }));
      await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
