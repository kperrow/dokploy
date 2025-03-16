import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";
import { useUrl } from "@/utils/hooks/use-url";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenBoxIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from 'next/router';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  giteaUrl: z.string().min(1, "Gitea URL is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

interface Props {
  giteaId: string;
}

export const EditGiteaProvider = ({ giteaId }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: gitea, isLoading, refetch } = api.gitea.one.useQuery({ giteaId });
  const { mutateAsync, isLoading: isUpdating } = api.gitea.update.useMutation();
  const { mutateAsync: testConnection, isLoading: isTesting } = api.gitea.testConnection.useMutation();
  const url = useUrl();
  const utils = api.useUtils();

  // Handle OAuth redirect results
  useEffect(() => {
    const { connected, error } = router.query;
    
    // Only process if router is ready and query parameters exist
    if (!router.isReady) return;

    if (connected) {
      toast.success("Successfully connected to Gitea", {
        description: "Your Gitea provider has been authorized.",
        id: 'gitea-connection-success'
      });
      refetch();
      // Clear the query parameters to prevent re-triggering
      router.replace({ 
        pathname: router.pathname, 
        query: {} 
      }, undefined, { shallow: true });
    }

    if (error) {
      toast.error("Gitea Connection Failed", {
        description: decodeURIComponent(error as string),
        id: 'gitea-connection-error'
      });
      // Clear the query parameters to prevent re-triggering
      router.replace({ 
        pathname: router.pathname, 
        query: {} 
      }, undefined, { shallow: true });
    }
  }, [router.query, router.isReady, refetch]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      giteaUrl: "https://gitea.com",
      clientId: "",
      clientSecret: "",
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (gitea) {
      form.reset({
        name: gitea.gitProvider?.name || "",
        giteaUrl: gitea.giteaUrl || "https://gitea.com",
        clientId: gitea.clientId || "",
        clientSecret: gitea.clientSecret || "",
      });
    }
  }, [gitea, form.reset]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await mutateAsync({
      giteaId: giteaId,
      gitProviderId: gitea?.gitProvider?.gitProviderId || "",
      name: values.name,
      giteaUrl: values.giteaUrl,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
    })
      .then(async () => {
        await utils.gitProvider.getAll.invalidate();
        toast.success("Gitea provider updated successfully");
        await refetch();
        setOpen(false);
      })
      .catch(() => {
        toast.error("Error updating Gitea provider");
      });
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection({ giteaId });
      toast.success("Gitea Connection Verified", {
        description: result
      });
    } catch (error: any) {
      const authUrl = error.authorizationUrl || getGiteaOAuthUrl();
      
      toast.error("Gitea Not Connected", {
        description: error.message || "Please complete the OAuth authorization process.",
        action: authUrl && authUrl !== "#" ? {
          label: "Authorize Now",
          onClick: () => window.open(authUrl, "_blank")
        } : undefined,
      });
    }
  };

  // Generate Gitea OAuth URL with state parameter
  const getGiteaOAuthUrl = () => {
    const clientId = form.getValues().clientId;
    const giteaUrl = form.getValues().giteaUrl;
    
    if (!clientId || !giteaUrl) {
      toast.error("Configuration Incomplete", {
        description: "Please fill in Client ID and Gitea URL first."
      });
      return "#";
    }
    
    const redirectUri = `${url}/api/providers/gitea/callback`;
  
    // Use the scopes from the gitea data (if available), else fallback to default scopes
    const scopes = gitea?.scopes?.split(',').join(' ') || 'repo repo:status read:user read:org';
    //const scopes = gitea?.scopes || 'repo,repo:status,read:user,read:org';
    
    const state = giteaId;
    
    return `${giteaUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
  };

  // Show loading state if data is being fetched
  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <PenBoxIcon className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="group hover:bg-blue-500/10">
          <PenBoxIcon className="size-3.5 text-primary group-hover:text-blue-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Gitea Provider</DialogTitle>
          <DialogDescription>
            Update your Gitea provider details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Gitea" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="giteaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gitea URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://gitea.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Client ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Client Secret"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                isLoading={isTesting}
              >
                Test Connection
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  const authUrl = getGiteaOAuthUrl();
                  if (authUrl !== "#") {
                    window.open(authUrl, "_blank");
                  }
                }}
              >
                Connect to Gitea
              </Button>
              
              <Button type="submit" isLoading={isUpdating}>
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};