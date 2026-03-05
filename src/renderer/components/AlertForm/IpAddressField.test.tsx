import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IpAddressField } from './IpAddressField';

function renderField(overrides: {
  value?: string;
  isPublic?: boolean;
  onChange?: (v: string) => void;
  onPublicToggle?: (v: boolean) => void;
  disabled?: boolean;
}) {
  const onChange = overrides.onChange ?? vi.fn();
  const onPublicToggle = overrides.onPublicToggle ?? vi.fn();

  render(
    <IpAddressField
      id="src_ip"
      label="Source IP"
      value={overrides.value ?? ''}
      isPublic={overrides.isPublic ?? false}
      onChange={onChange}
      onPublicToggle={onPublicToggle}
      disabled={overrides.disabled}
    />,
  );

  return { onChange, onPublicToggle };
}

describe('IpAddressField', () => {
  describe('rendering', () => {
    it('renders the label', () => {
      renderField({});
      // Use getByRole to find the text input specifically (not the checkbox)
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Source IP')).toBeInTheDocument();
    });

    it('renders the public toggle checkbox', () => {
      renderField({});
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('shows the value in the input', () => {
      renderField({ value: '192.168.1.1' });
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('192.168.1.1');
    });

    it('checkbox is unchecked when isPublic is false', () => {
      renderField({ isPublic: false });
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('checkbox is checked when isPublic is true', () => {
      renderField({ isPublic: true });
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('input is disabled when disabled prop is true', () => {
      renderField({ disabled: true });
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('onChange callback', () => {
    it('calls onChange when user types', async () => {
      const onChange = vi.fn();
      renderField({ onChange });
      await userEvent.type(screen.getByRole('textbox'), '192');
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('onPublicToggle callback', () => {
    it('calls onPublicToggle when checkbox is clicked', async () => {
      const onPublicToggle = vi.fn();
      renderField({ onPublicToggle });
      await userEvent.click(screen.getByRole('checkbox'));
      expect(onPublicToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('validation — private IPs accepted', () => {
    it('shows no error for 192.168.1.1 without public toggle', async () => {
      renderField({ value: '192.168.1.1', isPublic: false });
      // Blur the input to trigger validation
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows no error for 10.0.0.1 without public toggle', async () => {
      renderField({ value: '10.0.0.1', isPublic: false });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows no error for 172.16.0.1 without public toggle', async () => {
      renderField({ value: '172.16.0.1', isPublic: false });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation — public IP without toggle is rejected', () => {
    it('shows error for 8.8.8.8 without public toggle after blur', () => {
      renderField({ value: '8.8.8.8', isPublic: false });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('alert')).toHaveTextContent(/Public IP/);
    });

    it('shows error mentioning "Toggle" instruction', () => {
      renderField({ value: '1.1.1.1', isPublic: false });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('alert')).toHaveTextContent(/Toggle/);
    });
  });

  describe('validation — public IP with toggle is accepted', () => {
    it('shows no error for 8.8.8.8 when public toggle is on', () => {
      renderField({ value: '8.8.8.8', isPublic: true });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows no error for 1.1.1.1 when public toggle is on', () => {
      renderField({ value: '1.1.1.1', isPublic: true });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation — invalid IPs are rejected', () => {
    it('shows error for IPv6 address', () => {
      renderField({ value: '2001:db8::1' });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('alert')).toHaveTextContent(/IPv6/);
    });

    it('shows error for malformed IP', () => {
      renderField({ value: '999.999.999.999' });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows error for text input', () => {
      renderField({ value: 'not-an-ip' });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('validation — empty field allowed', () => {
    it('shows no error for empty value', () => {
      renderField({ value: '' });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('input has aria-invalid when error present', () => {
      renderField({ value: '8.8.8.8', isPublic: false });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('input does not have aria-invalid when valid', () => {
      renderField({ value: '192.168.1.1', isPublic: false });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });
  });
});
