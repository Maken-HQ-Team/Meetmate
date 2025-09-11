import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, ArrowLeft } from 'lucide-react';

interface AppUpdate {
  id: string;
  version: string;
  title: string;
  content: string;
  created_at: string;
  badge_label?: string | null;
  badge_variant?: 'default' | 'secondary' | 'destructive' | 'outline' | null;
  badge_style?: string | null;
}

const Updates: React.FC = () => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setUpdates(data as AppUpdate[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AppLayout>
      <div className="w-full p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Product Updates</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-10">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading updates...</div>
        ) : updates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No updates yet.</div>
        ) : (
          <div className="space-y-4">
            {updates.map((u) => (
              <Card key={u.id} className="update-card">
                {u.badge_label && (
                  <div className="update-label update-label--danger">
                    {u.badge_label}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">{u.title}</CardTitle>
                    <Badge variant="secondary">v{u.version}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {u.content}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Updates;


