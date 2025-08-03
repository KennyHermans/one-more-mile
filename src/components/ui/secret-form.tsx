import React from 'react';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';

interface SecretFormProps {
  name: string;
}

export function SecretForm({ name }: SecretFormProps) {
  const openSupabaseSecrets = () => {
    window.open('https://supabase.com/dashboard/project/qvirgcrbnwcyhbqdazjy/settings/functions', '_blank');
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 border border-dashed border-muted-foreground/25 rounded-lg">
      <Key className="h-8 w-8 text-muted-foreground" />
      <div className="text-center">
        <h3 className="font-semibold mb-2">Configure {name}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please add the {name} secret to your Supabase project to enable AI-powered features.
        </p>
        <Button onClick={openSupabaseSecrets}>
          Open Supabase Secrets
        </Button>
      </div>
    </div>
  );
}