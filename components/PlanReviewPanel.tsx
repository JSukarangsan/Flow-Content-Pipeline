import React, { useState } from 'react';
import { WeeklyPlan, PlannedPost, Pillar, Platform } from '../types';
import { PLATFORM_CONFIG } from '../constants';

interface PlanReviewPanelProps {
  plan: WeeklyPlan;
  pillars: Pillar[];
  onUpdatePost: (postId: string, updates: Partial<PlannedPost>) => void;
  onDraftPost: (post: PlannedPost) => void;
  onClose: () => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PlanReviewPanel: React.FC<PlanReviewPanelProps> = ({
  plan,
  pillars,
  onUpdatePost,
  onDraftPost,
  onClose,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const getPillarTitle = (pillarId: string) => {
    const pillar = pillars.find((p) => p.id === pillarId);
    return pillar?.title || 'Unknown';
  };

  const getWeekDates = () => {
    const start = new Date(plan.weekStart);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const getPostsForDay = (dayOfWeek: number) => {
    return plan.posts.filter((p) => p.dayOfWeek === dayOfWeek);
  };

  const getStatusColor = (status: PlannedPost['status']) => {
    switch (status) {
      case 'planned':
        return 'bg-gray-700 text-gray-300';
      case 'drafted':
        return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'approved':
        return 'bg-green-600/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const totalPosts = plan.posts.length;
  const draftedPosts = plan.posts.filter((p) => p.status === 'drafted' || p.status === 'approved').length;
  const approvedPosts = plan.posts.filter((p) => p.status === 'approved').length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-[5vh] justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 w-[900px] max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-white">Weekly Plan Review</h3>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  plan.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                  plan.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {plan.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Week of {new Date(plan.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Progress */}
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {draftedPosts}/{totalPosts} drafted, {approvedPosts} approved
                </div>
                <div className="w-32 h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-accent-500 transition-all"
                    style={{ width: `${(draftedPosts / totalPosts) * 100}%` }}
                  />
                </div>
              </div>

              {/* View toggle */}
              <div className="flex bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 text-xs rounded ${
                    viewMode === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-400'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-xs rounded ${
                    viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'
                  }`}
                >
                  List
                </button>
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
        </div>

        {/* Insights */}
        {plan.insights && (
          <div className="px-6 py-3 bg-accent-500/5 border-b border-gray-800">
            <p className="text-sm text-gray-300">
              <span className="text-accent-400 font-medium">AI Insight: </span>
              {plan.insights}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'calendar' ? (
            // Calendar View
            <div className="grid grid-cols-7 gap-3">
              {weekDates.map((date, i) => {
                const dayPosts = getPostsForDay(i);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`min-h-40 bg-gray-800/30 rounded-lg p-3 ${
                      isToday ? 'ring-1 ring-accent-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-medium ${isToday ? 'text-accent-400' : 'text-gray-500'}`}>
                        {SHORT_DAYS[i]}
                      </span>
                      <span className={`text-xs ${isToday ? 'text-accent-400' : 'text-gray-600'}`}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dayPosts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                          className={`w-full text-left p-2 rounded border transition-colors ${getStatusColor(post.status)} hover:opacity-80`}
                        >
                          <div className={`text-[10px] font-medium ${PLATFORM_CONFIG[post.platform].color}`}>
                            {PLATFORM_CONFIG[post.platform].label}
                          </div>
                          <div className="text-xs mt-1 line-clamp-2 text-gray-300">
                            {post.hook}
                          </div>
                        </button>
                      ))}
                      {dayPosts.length === 0 && (
                        <div className="text-xs text-gray-600 text-center py-4">
                          No posts
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              {DAYS.map((day, i) => {
                const dayPosts = getPostsForDay(i);
                if (dayPosts.length === 0) return null;
                return (
                  <div key={day}>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      {day}, {weekDates[i].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h4>
                    <div className="space-y-2">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`text-sm font-medium ${PLATFORM_CONFIG[post.platform].color}`}>
                                  {PLATFORM_CONFIG[post.platform].label}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {getPillarTitle(post.pillarId)}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] rounded border ${getStatusColor(post.status)}`}>
                                  {post.status}
                                </span>
                              </div>
                              <p className="text-white mb-2">&ldquo;{post.hook}&rdquo;</p>
                              <p className="text-sm text-gray-400 mb-1">
                                <strong>Angle:</strong> {post.angle}
                              </p>
                              <p className="text-xs text-gray-500">
                                <strong>Reasoning:</strong> {post.reasoning}
                              </p>
                            </div>
                            <div className="flex flex-col space-y-2 ml-4">
                              {post.status === 'planned' && (
                                <button
                                  onClick={() => onDraftPost(post)}
                                  className="px-3 py-1.5 text-xs bg-accent-600 text-white rounded hover:bg-accent-500 transition-colors"
                                >
                                  Draft It
                                </button>
                              )}
                              {post.status === 'drafted' && (
                                <button
                                  onClick={() => onUpdatePost(post.id, { status: 'approved' })}
                                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              {post.status === 'approved' && (
                                <span className="px-3 py-1.5 text-xs text-green-400">
                                  Ready
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-600">
            Created {new Date(plan.createdAt).toLocaleDateString()}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
