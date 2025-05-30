import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WaitingListEntry, fetchWaitingListEntries, addToWaitingList, removeFromWaitingList } from '@/lib/api/waitingList';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface SkillItem {
    id: string;
    name: string;
}

const WaitingList = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [waitingSkills, setWaitingSkills] = useState<WaitingListEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
    const [newSkill, setNewSkill] = useState('');
    const [skillName, setSkillName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [notify, setNotify] = useState(true);

    useEffect(() => {
        fetchWaitingSkills();
        fetchAvailableSkills();
    }, []);

    const fetchWaitingSkills = async () => {
        try {
            setIsLoading(true);
            const data = await fetchWaitingListEntries();
            setWaitingSkills(data);
        } catch (error) {
            console.error('Error fetching waiting skills:', error);
            toast({
                title: "Error",
                description: "Failed to load waiting skills",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableSkills = async () => {
        try {
            const { data, error } = await supabase
                .from('skills')
                .select('id, name');

            if (error) throw error;
            setAvailableSkills(data || []);
        } catch (error) {
            console.error('Error fetching available skills:', error);
        }
    };

    const handleTeachSkill = async (waitingSkill: WaitingListEntry) => {
        if (!user) return;

        setIsLoading(true);
        try {
            // Find the skill ID from the name
            const skillItem = availableSkills.find(
                (skill) => skill.name.toLowerCase() === waitingSkill.desired_skill.toLowerCase()
            );

            if (skillItem) {
                const { error: insertError } = await supabase
                    .from('user_skills')
                    .insert({
                        user_id: user.id,
                        skill_id: skillItem.id,
                        type: 'teach'
                    });

                if (insertError) throw insertError;
            }

            // Remove from waiting list
            await removeFromWaitingList(waitingSkill.id);

            // Update UI
            setWaitingSkills((prev) =>
                prev.filter((ws) => ws.id !== waitingSkill.id)
            );

            toast({
                title: "Success",
                description: `You've offered to teach ${waitingSkill.desired_skill}`,
                variant: "default"
            });
        } catch (error) {
            console.error('Error offering skill:', error);
            toast({
                title: "Error",
                description: "Could not offer this skill. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToWaitingList = async () => {
        if (!user || !newSkill.trim()) return;

        setIsLoading(true);
        try {
            const result = await addToWaitingList(user.email || '', newSkill.trim(), undefined, user.id);
            if (result.success) {
                // Refresh the list after adding
                await fetchWaitingSkills();
                setNewSkill('');

                toast({
                    title: "Success",
                    description: "Skill added to waiting list",
                });
            }
        } catch (error) {
            console.error('Error adding to waiting list:', error);
            toast({
                title: "Error",
                description: "Failed to add skill to waiting list",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Example categories (replace with your actual categories)
    const categories = [
        'Arts & Crafts',
        'Cooking & Baking',
        'Design',
        'Languages',
        'Music',
        'Programming & Technology',
        'Sports & Fitness',
        'Other',
    ];

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast({
                title: "Error",
                description: "Please sign in to add a skill to the waiting list",
                variant: "destructive"
            });
            return;
        }

        if (!skillName.trim() || !category) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            // Add to waiting list
            const result = await addToWaitingList(user.email || '', skillName.trim(), category, user.id);

            if (result.success) {
                // Refresh the list after adding
                await fetchWaitingSkills();

                // Reset form
                setSkillName('');
                setCategory('');
                setDescription('');

                toast({
                    title: "Success",
                    description: "Skill added to waiting list",
                });
            }
        } catch (error) {
            console.error('Error adding to waiting list:', error);
            toast({
                title: "Error",
                description: "Failed to add skill to waiting list",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a101a]">
            <NavBar />
            <main className="container mx-auto py-10 px-4">
                <h1 className="text-3xl font-bold text-center mb-8">Skill Waiting List</h1>
                <p className="text-center text-gray-600 mb-10">
                    Can't find a skill you want to learn? Add it to our waiting list and get notified when it becomes available.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Left: Request a Skill */}
                    <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-4 dark:bg-[#0a101a] dark:border dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-2">Request a Skill</h2>
                        <p className="text-gray-500 text-sm mb-4">
                            Fill out this form to add a skill you're looking for to the waiting list.
                        </p>
                        <form onSubmit={handleAddSkill} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Skill Name *</label>
                                <Input
                                    value={skillName}
                                    onChange={e => setSkillName(e.target.value)}
                                    placeholder="e.g., Japanese Cooking"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Category *</label>
                                <select
                                    className="w-full p-2 border rounded bg-white text-black border-gray-300 dark:bg-[#0a101a] dark:text-white dark:border-gray-700"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Briefly describe what you'd like to learn"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={notify}
                                    onChange={e => setNotify(e.target.checked)}
                                    id="notify"
                                    className="accent-primary"
                                />
                                <label htmlFor="notify" className="text-sm">Notify me when someone offers this skill</label>
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? "Adding..." : "Add to Waiting List"}
                            </Button>
                        </form>
                    </div>

                    {/* Right: Current Waiting List */}
                    <div className="bg-white rounded-lg shadow p-6 dark:bg-[#0a101a] dark:border dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Current Waiting List</h2>
                        <p className="text-gray-500 text-sm mb-4">
                            Skills people are waiting to learn. If you can teach any of these, add them to your profile!
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-2 font-medium">Skill</th>
                                        <th className="py-2 px-2 font-medium">Category</th>
                                        <th className="py-2 px-2 font-medium">Requested</th>
                                        <th className="py-2 px-2 font-medium">People Waiting</th>
                                        <th className="py-2 px-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waitingSkills.length > 0 ? waitingSkills.map((ws, idx) => (
                                        <tr key={ws.id} className="border-b hover:bg-gray-50 dark:hover:bg-[#101624]">
                                            <td className="py-2 px-2">{ws.desired_skill}</td>
                                            <td className="py-2 px-2">
                                                <Badge>Other</Badge>
                                            </td>
                                            <td className="py-2 px-2 text-gray-500">{new Date(ws.created_at).toISOString().split('T')[0]}</td>
                                            <td className="py-2 px-2">
                                                <Badge variant="secondary">1</Badge>
                                            </td>
                                            <td className="py-2 px-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-primary hover:bg-primary-dark"
                                                    onClick={() => handleTeachSkill(ws)}
                                                    disabled={isLoading}
                                                >
                                                    I Can Teach This
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                                No skills are currently in the waiting list
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default WaitingList;