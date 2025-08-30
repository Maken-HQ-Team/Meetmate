import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TIMEZONES, getCurrentTimeInTimezone, getTimezoneById } from '@/data/timezones';
import { getAllCategories, getAvatarsByCategory } from '@/data/avatars';
import { AvatarCropModal } from '@/components/ui/avatar-crop-modal';
import AppLayout from '@/components/layout/AppLayout';
import { User, Save, Upload, Camera, Clock, Palette, ImageIcon, ArrowLeft } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  timezone_id: string;
  bio: string;
  avatar_url: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    timezone_id: 'America/New_York',
    bio: '',
    avatar_url: '',
  });
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(getCurrentTimeInTimezone(profileData.timezone_id));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [profileData.timezone_id]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setProfileData({
          name: data.name || '',
          email: data.email || user.email || '',
          timezone_id: data.timezone || 'America/New_York',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        });
      } else {
        // Create initial profile with user's detected timezone if available
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
        setProfileData({
          name: user.user_metadata?.name || '',
          email: user.email || '',
          timezone_id: user.user_metadata?.timezone || detectedTimezone,
          bio: '',
          avatar_url: '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleTimezoneChange = (timezoneId: string) => {
    setProfileData(prev => ({
      ...prev,
      timezone_id: timezoneId,
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔄 File upload triggered');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('❌ Invalid file type:', file.type);
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF, etc.).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', file.size);
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: user?.id
    });

    setLoading(true);

    try {
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Delete old avatar if exists
      if (profileData.avatar_url && profileData.avatar_url.includes('supabase')) {
        console.log('🗑️ Deleting old avatar...');
        const oldFileName = profileData.avatar_url.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldFileName}`]);

          if (deleteError) {
            console.log('⚠️ Failed to delete old avatar:', deleteError);
          } else {
            console.log('✅ Old avatar deleted');
          }
        }
      }

      // Upload to Supabase Storage with user folder structure
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      console.log('📤 Uploading to storage:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        toast({
          title: "Upload Error",
          description: uploadError.message || "Failed to upload avatar. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL generated:', publicUrl);

      // Check if image is square-ish
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        console.log('📐 Image aspect ratio:', aspectRatio, `(${img.width}x${img.height})`);

        if (aspectRatio < 0.8 || aspectRatio > 1.2) {
          // Not square, open crop modal
          console.log('✂️ Image not square, opening crop modal', { file, aspectRatio });
          setSelectedImageFile(file);
          setShowCropModal(true);
        } else {
          // Already square enough, use directly
          console.log('✅ Image is square, using directly');
          handleInputChange('avatar_url', publicUrl);
          toast({
            title: "Avatar Updated",
            description: "Your avatar has been uploaded successfully.",
          });
        }
      };

      img.onerror = () => {
        console.error('❌ Failed to load image for aspect ratio check');
        toast({
          title: "Error",
          description: "Failed to process the image. Please try again.",
          variant: "destructive",
        });
      };

      img.src = URL.createObjectURL(file);
    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setLoading(true);
    try {
      // Delete old avatar if exists
      if (profileData.avatar_url && profileData.avatar_url.includes('supabase')) {
        const oldFileName = profileData.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user?.id}/${oldFileName}`]);
        }
      }

      // Upload cropped image to Supabase Storage with user folder structure
      const fileName = `${user?.id}/avatar_cropped_${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Crop upload error:', uploadError);
        toast({
          title: "Upload Error",
          description: uploadError.message || "Failed to save cropped avatar. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      handleInputChange('avatar_url', publicUrl);
      setShowCropModal(false);
      setSelectedImageFile(null);

      toast({
        title: "Avatar Updated",
        description: "Your cropped avatar has been saved successfully.",
      });
    } catch (error) {
      console.error('Crop save error:', error);
      toast({
        title: "Error",
        description: "Failed to save cropped avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePredefinedAvatarSelect = (avatarUrl: string) => {
    handleInputChange('avatar_url', avatarUrl);
    setShowAvatarPicker(false);
  };

  const handleSave = async () => {
    if (!user) return;
  
    setLoading(true);
    try {
      const timezone = getTimezoneById(profileData.timezone_id);
      const updateData = {
        user_id: user.id, // 👈 ensure user_id is always included
        name: profileData.name,
        email: profileData.email,
        timezone: timezone?.id || profileData.timezone_id,
        country: timezone?.country || "Unknown",
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
      };
  
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id)
        .select();
  
      if (error) throw error;
  
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  

  const selectedTimezone = TIMEZONES.find(tz => tz.id === profileData.timezone_id);
  const initials = profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>
              Update your profile details and timezone settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileData.avatar_url} alt={profileData.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={loading}
                    onClick={() => {
                      console.log('🔄 Upload button clicked');
                      document.getElementById('avatar-upload')?.click();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    <span>{loading ? 'Uploading...' : 'Upload'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAvatarPicker(true)}
                    className="flex items-center space-x-2"
                    disabled={loading}
                  >
                    <Palette className="h-4 w-4" />
                    <span>Choose</span>
                  </Button>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground">
                  Upload your own or choose from presets
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  type="email"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Timezone</span>
              </Label>
              <Select value={profileData.timezone_id} onValueChange={handleTimezoneChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.id} value={timezone.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2">
                          <span>{timezone.flag}</span>
                          <span>{timezone.city}, {timezone.country}</span>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {timezone.utc}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTimezone && currentTime && (
                <p className="text-sm text-muted-foreground flex items-center space-x-2">
                  <Clock className="h-3 w-3" />
                  <span>Your current time is {currentTime}</span>
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {profileData.bio.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Picker Modal */}
        <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span>Choose Avatar</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {getAllCategories().map((category) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-medium capitalize text-sm text-muted-foreground">
                    {category}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {getAvatarsByCategory(category).map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => handlePredefinedAvatarSelect(avatar.url)}
                        className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Avatar Crop Modal */}
        <AvatarCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setSelectedImageFile(null);
          }}
          imageFile={selectedImageFile}
          onCropComplete={handleCropComplete}
        />
      </div>
    </AppLayout>
  );
};

export default Settings;