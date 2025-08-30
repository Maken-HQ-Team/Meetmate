import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfileCard } from '../user-profile-card';
import { useUserNotes } from '@/hooks/useUserNotes';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/useUserNotes');
jest.mock('@/hooks/use-toast');
jest.mock('@/data/countries', () => ({
  getCountryFlag: (country: string) => country === 'US' ? '🇺🇸' : '🏳️',
}));

const mockUseUserNotes = useUserNotes as jest.MockedFunction<typeof useUserNotes>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('UserProfileCard', () => {
  const mockToast = jest.fn();
  const mockGetNoteForUser = jest.fn();
  const mockSaveNote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ toast: mockToast } as any);
    mockUseUserNotes.mockReturnValue({
      getNoteForUser: mockGetNoteForUser,
      saveNote: mockSaveNote,
    } as any);
  });

  describe('Profile Data Display', () => {
    it('should display complete profile information correctly', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          country="US"
          bio="Software developer"
          avatar_url="https://example.com/avatar.jpg"
          userId="user-123"
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('Software developer')).toBeInTheDocument();
    });

    it('should handle missing name with email fallback', () => {
      render(
        <UserProfileCard
          name={null}
          email="john@example.com"
          userId="user-123"
        />
      );

      expect(screen.getByText('john')).toBeInTheDocument(); // Email username part
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle missing email with user ID fallback', () => {
      render(
        <UserProfileCard
          name={null}
          email={null}
          userId="user-123456789"
        />
      );

      expect(screen.getByText('User user-123')).toBeInTheDocument();
      expect(screen.getByText('user-123@unknown.com')).toBeInTheDocument();
      expect(screen.getByText('Profile data unavailable')).toBeInTheDocument();
    });

    it('should display Unknown User when no data available', () => {
      render(
        <UserProfileCard
          name={null}
          email={null}
          userId={undefined}
        />
      );

      expect(screen.getByText('Unknown User')).toBeInTheDocument();
      expect(screen.getByText('No email available')).toBeInTheDocument();
    });

    it('should show limited data badge when profile incomplete', () => {
      render(
        <UserProfileCard
          name={null}
          email="john@example.com"
          userId="user-123"
        />
      );

      expect(screen.getByText('Limited data')).toBeInTheDocument();
    });

    it('should display location unknown when country missing', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          country={null}
          userId="user-123"
        />
      );

      expect(screen.getByText('Location unknown')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading skeleton when loading is true', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
          loading={true}
        />
      );

      // Check for loading skeleton elements
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error state when error is provided', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
          error="Failed to load profile data"
        />
      );

      expect(screen.getByText('Profile Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load profile data')).toBeInTheDocument();
      expect(screen.getByText('User ID: user-123...')).toBeInTheDocument();
    });
  });

  describe('Avatar Display', () => {
    it('should display avatar image when available', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          avatar_url="https://example.com/avatar.jpg"
          userId="user-123"
        />
      );

      const avatarImage = screen.getByRole('img');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatarImage).toHaveAttribute('alt', 'John Doe');
    });

    it('should display initials fallback when no avatar', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          avatar_url={null}
          userId="user-123"
        />
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display user ID initials when no name available', () => {
      render(
        <UserProfileCard
          name={null}
          email={null}
          avatar_url={null}
          userId="user-123456"
        />
      );

      expect(screen.getByText('US')).toBeInTheDocument(); // First 2 chars of user ID
    });
  });

  describe('Personal Notes', () => {
    it('should display existing note', () => {
      mockGetNoteForUser.mockReturnValue({
        nickname: 'Johnny',
        note: 'Great developer',
      });

      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
        />
      );

      expect(screen.getByText('Johnny')).toBeInTheDocument();
      expect(screen.getByText('Real name: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Great developer')).toBeInTheDocument();
    });

    it('should allow editing notes', async () => {
      mockGetNoteForUser.mockReturnValue(null);
      mockSaveNote.mockResolvedValue(true);

      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
        />
      );

      // Click Add button
      fireEvent.click(screen.getByText('Add'));

      // Fill in note form
      const nicknameInput = screen.getByPlaceholderText('Nickname (optional)');
      const noteTextarea = screen.getByPlaceholderText('Add a personal note to remember who this is...');

      fireEvent.change(nicknameInput, { target: { value: 'Johnny' } });
      fireEvent.change(noteTextarea, { target: { value: 'Great developer' } });

      // Save note
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockSaveNote).toHaveBeenCalledWith('user-123', 'Johnny', 'Great developer');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Note saved",
        description: "Your personal note has been saved.",
      });
    });

    it('should handle note save failure', async () => {
      mockGetNoteForUser.mockReturnValue(null);
      mockSaveNote.mockResolvedValue(false);

      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
        />
      );

      fireEvent.click(screen.getByText('Add'));
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to save note. Please try again.",
          variant: "destructive",
        });
      });
    });

    it('should allow canceling note edit', () => {
      mockGetNoteForUser.mockReturnValue({
        nickname: 'Johnny',
        note: 'Great developer',
      });

      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      
      const nicknameInput = screen.getByDisplayValue('Johnny');
      fireEvent.change(nicknameInput, { target: { value: 'Changed' } });

      fireEvent.click(screen.getByText('Cancel'));

      // Should revert to original values
      expect(screen.getByText('Johnny')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
        />
      );

      const avatarImage = screen.getByRole('img');
      expect(avatarImage).toHaveAttribute('alt', 'John Doe');
    });

    it('should be keyboard navigable', () => {
      render(
        <UserProfileCard
          name="John Doe"
          email="john@example.com"
          userId="user-123"
        />
      );

      const addButton = screen.getByText('Add');
      expect(addButton).toBeInTheDocument();
      
      // Should be focusable
      addButton.focus();
      expect(document.activeElement).toBe(addButton);
    });
  });
});