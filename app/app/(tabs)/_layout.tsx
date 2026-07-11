import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { SyncStatus } from '@/components/SyncStatus';
import { FeedbackButton } from '@/components/FeedbackButton';
import { AppLogo } from '@/components/AppLogo';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { View } from 'react-native';
import { useResponsive } from '@/lib/useResponsive';
import { useJournalStore } from '@/lib/store';
import { useTheme } from '@/lib/ThemeProvider';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { isMobile } = useResponsive();
  const simpleMode = useJournalStore((s) => s.simpleMode);
  const { colors, resolvedTheme } = useTheme();

  // Design system: light mode uses softer tonal tab bar, dark uses ghost-border technical bar
  const isLight = resolvedTheme === 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isLight ? colors.primaryAccent : colors.secondaryAccent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: isLight ? colors.surfaceContainerLow : colors.background,
          borderTopColor: isLight ? colors.outlineVariant : colors.border,
          borderTopWidth: isLight ? 0.5 : 1,
          height: isMobile ? 80 : 56,
          paddingBottom: isMobile ? 20 : 8,
          paddingTop: 8,
          ...(isLight && { 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }),
        },
        tabBarLabelStyle: {
          fontSize: isMobile ? 10 : 12,
          fontWeight: isLight ? '500' : '600',
          letterSpacing: isLight ? 0 : 0.3,
        },
        headerStyle: {
          backgroundColor: isLight ? colors.surfaceContainerLowest : colors.background,
          ...(isLight && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }),
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: isLight ? '500' : '700',
          fontSize: isLight ? 20 : 18,
          letterSpacing: isLight ? -0.01 * 20 : 0,
        },
        headerShadowVisible: false,
        headerLeft: () => (
          <View style={{ marginLeft: 12, marginRight: 4 }}>
            <AppLogo size={30} />
          </View>
        ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemeToggleButton />
            <FeedbackButton />
            <SyncStatus />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: simpleMode ? 'Home' : 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color }) => <TabBarIcon name="tags" color={color} />,
          href: simpleMode ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
          href: simpleMode ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="graph"
        options={{
          title: 'Graph',
          tabBarIcon: ({ color }) => <TabBarIcon name="share-alt" color={color} />,
          href: simpleMode ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
