import React, { useState, useMemo } from 'react';
import { Pillar, Execution, Platform, WeeklyPlan, PlannedPost, UserSettings } from '../types';
import { generateWeeklyPlan, GeneratedPlan } from '../services/geminiService';
import { PLATFORM_CONFIG } from '../constants';

interface WeeklyPlanModalProps {
  pillars: Pillar[];
  executions: Execution[];
  settings: UserSettings;
  onClose: () => void;
  onPlanGenerated: (plan: WeeklyPlan) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WeeklyPlanModal: React.FC<WeeklyPlanModalProps> = ({
  pillars,
  executions,
  settings,
  onClose,
  onPlanGenerated,
}) => {
  const [step, setStep] = useState<'config' | 'generating' | 'review'>('config');
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['linkedin', 'twitter']);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get top performing published content
  const topPerforming = useMemo(() => {
    return executions
      .filter((e) => e.status === 'published' && e.performanceScore !== undefined)
      .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
      .slice(0, 10);
  }, [executions]);

  const activePillars = pillars.filter((p) => p.status === 'active');

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Select at least one platform');
      return;
    }
    if (activePillars.length === 0) {
      setError('You need at least one active pillar');
      return;
    }

    setError(null);
    setStep('generating');

    try {
      const plan = await generateWeeklyPlan(
        {
          pillars: activePillars,
          topPerformingContent: topPerforming,
          platformMix: selectedPlatforms,
          postsPerWeek,
        },
        settings
      );
      setGeneratedPlan(plan);
      setStep('review');
    } catch (e) {
      setError('Failed to generate plan. Check your API key.');
      setStep('config');
    }
  };

  const handleApprove = () => {
    if (!generatedPlan) return;

    // Get the next Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    const weeklyPlan: WeeklyPlan = {
      id: `plan-${Date.now()}`,
      weekStart: nextMonday.toISOString().split('T')[0],
      status: 'draft',
      posts: generatedPlan.posts.map((post, i) => ({
        ...post,
        id: `post-${Date.now()}-${i}`,
        status: 'planned' as const,
      })),
      insights: generatedPlan.insights,
      createdAt: new Date().toISOString(),
    };

    onPlanGenerated(weeklyPlan);
    onClose();
  };

  const getPillarTitle = (pillarId: string) => {
    const pillar = pillars.find((p) => p.id === pillarId);
    return pillar?.title || 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-[5vh] justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 w-[800px] max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Weekly Plan Generator</h3>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered content planning based on your top performers
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'config' && (
            <div className="space-y-6">
              {/* Posts per week */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Posts per week
                </label>
                <div className="flex space-x-2">
                  {[3, 5, 7, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setPostsPerWeek(num)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        postsPerWeek === num
                          ? 'bg-accent-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Platforms to include
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['linkedin', 'twitter', 'newsletter', 'instagram', 'youtube'] as Platform[]).map(
                    (platform) => (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedPlatforms.includes(platform)
                            ? 'bg-accent-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {PLATFORM_CONFIG[platform].label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Top performers preview */}
              {topPerforming.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Top performing content (used for inspiration)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {topPerforming.slice(0, 5).map((exec) => (
                      <div
                        key={exec.id}
                        className="p-3 bg-gray-800/50 rounded-lg flex items-start justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                            <span className={PLATFORM_CONFIG[exec.platform].color}>
                              {PLATFORM_CONFIG[exec.platform].label}
                            </span>
                            <span>Score: {exec.performanceScore}</span>
                          </div>
                          <p className="text-sm text-gray-300 truncate">{exec.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {topPerforming.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Import performance data to get AI recommendations
                    </p>
                  )}
                </div>
              )}

              {/* Active pillars */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Active pillars ({activePillars.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {activePillars.map((pillar) => (
                    <span
                      key={pillar.id}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm"
                    >
                      {pillar.title}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-20">
              <svg
                className="w-12 h-12 text-accent-500 animate-spin mb-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-gray-400">Analyzing your content and generating plan...</p>
            </div>
          )}

          {step === 'review' && generatedPlan && (
            <div className="space-y-6">
              {/* Insights */}
              {generatedPlan.insights && (
                <div className="p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-accent-400 mb-2">AI Insights</h4>
                  <p className="text-sm text-gray-300">{generatedPlan.insights}</p>
                </div>
              )}

              {/* Calendar view */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Weekly Schedule</h4>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, i) => {
                    const dayPosts = generatedPlan.posts.filter((p) => p.dayOfWeek === i);
                    return (
                      <div key={day} className="min-h-32">
                        <div className="text-xs font-medium text-gray-500 mb-2 text-center">
                          {day}
                        </div>
                        <div className="space-y-2">
                          {dayPosts.map((post, j) => (
                            <div
                              key={j}
                              className="p-2 bg-gray-800 rounded border border-gray-700 text-xs"
                            >
                              <div className={`font-medium ${PLATFORM_CONFIG[post.platform].color}`}>
                                {PLATFORM_CONFIG[post.platform].label}
                              </div>
                              <div className="text-gray-400 mt-1 line-clamp-2">{post.hook}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed list */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Post Details</h4>
                <div className="space-y-3">
                  {generatedPlan.posts.map((post, i) => (
                    <div key={i} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                            {DAYS[post.dayOfWeek]}
                          </span>
                          <span className={`text-sm font-medium ${PLATFORM_CONFIG[post.platform].color}`}>
                            {PLATFORM_CONFIG[post.platform].label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getPillarTitle(post.pillarId)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-white mb-2">&ldquo;{post.hook}&rdquo;</p>
                      <p className="text-xs text-gray-400 mb-2">
                        <strong>Angle:</strong> {post.angle}
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Why:</strong> {post.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-600">
            {step === 'config' && 'Configure your weekly plan'}
            {step === 'generating' && 'Please wait...'}
            {step === 'review' && `${generatedPlan?.posts.length || 0} posts planned`}
          </span>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {step === 'config' && (
              <button
                onClick={handleGenerate}
                disabled={selectedPlatforms.length === 0}
                className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded hover:bg-accent-500 transition-colors disabled:opacity-50"
              >
                Generate Plan
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-500 transition-colors"
              >
                Approve & Save Plan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
