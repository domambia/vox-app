import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from './AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

export interface FilterOption {
    id: string;
    label: string;
    value: any;
}

export interface FilterGroup {
    id: string;
    label: string;
    options: FilterOption[];
    multiSelect?: boolean;
}

interface FilterPanelProps {
    filters: FilterGroup[];
    activeFilters: Record<string, any[]>;
    onFilterChange: (filterId: string, values: any[]) => void;
    onClearAll: () => void;
    onApply: () => void;
}

/**
 * Accessible Filter Panel Component
 * Provides filtering functionality with proper accessibility
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    activeFilters,
    onFilterChange,
    onClearAll,
    onApply,
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (groupId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
            announceToScreenReader('Filter group collapsed');
        } else {
            newExpanded.add(groupId);
            announceToScreenReader('Filter group expanded');
        }
        setExpandedGroups(newExpanded);
    };

    const handleFilterToggle = (filterId: string, option: FilterOption, multiSelect: boolean) => {
        const currentValues = activeFilters[filterId] || [];
        let newValues: any[];

        if (multiSelect) {
            if (currentValues.includes(option.value)) {
                newValues = currentValues.filter((v) => v !== option.value);
                announceToScreenReader(`${option.label} filter removed`);
            } else {
                newValues = [...currentValues, option.value];
                announceToScreenReader(`${option.label} filter added`);
            }
        } else {
            newValues = currentValues.includes(option.value) ? [] : [option.value];
            if (newValues.length > 0) {
                announceToScreenReader(`${option.label} filter selected`);
            } else {
                announceToScreenReader('Filter cleared');
            }
        }

        onFilterChange(filterId, newValues);
    };

    const getActiveFilterCount = (): number => {
        return Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0);
    };

    const activeCount = getActiveFilterCount();

    return (
        <View style={styles.container} accessibilityLabel="Filter options">
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                    Filters
                </Text>
                {activeCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{activeCount}</Text>
                    </View>
                )}
                {activeCount > 0 && (
                    <TouchableOpacity
                        onPress={onClearAll}
                        style={styles.clearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear all filters"
                        accessibilityHint="Remove all active filters"
                    >
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {filters.map((group) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const groupActiveValues = activeFilters[group.id] || [];

                    return (
                        <View key={group.id} style={styles.filterGroup}>
                            <TouchableOpacity
                                onPress={() => toggleGroup(group.id)}
                                style={styles.groupHeader}
                                accessibilityRole="button"
                                accessibilityLabel={`${group.label} filter group. ${isExpanded ? 'Expanded' : 'Collapsed'}. ${groupActiveValues.length} selected`}
                                accessibilityState={{ expanded: isExpanded }}
                            >
                                <Text style={styles.groupLabel}>{group.label}</Text>
                                {groupActiveValues.length > 0 && (
                                    <View style={styles.groupBadge}>
                                        <Text style={styles.groupBadgeText}>{groupActiveValues.length}</Text>
                                    </View>
                                )}
                                <Ionicons
                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#6C757D"
                                />
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.optionsContainer}>
                                    {group.options.map((option) => {
                                        const isSelected = groupActiveValues.includes(option.value);
                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                onPress={() => handleFilterToggle(group.id, option, group.multiSelect ?? false)}
                                                style={[styles.option, isSelected && styles.optionSelected]}
                                                accessibilityRole="checkbox"
                                                accessibilityLabel={`${option.label} filter option`}
                                                accessibilityState={{ checked: isSelected }}
                                                accessibilityHint={isSelected ? 'Tap to remove filter' : 'Tap to add filter'}
                                            >
                                                <Ionicons
                                                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                    size={20}
                                                    color={isSelected ? '#007AFF' : '#6C757D'}
                                                />
                                                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <AccessibleButton
                    title="Apply Filters"
                    onPress={onApply}
                    variant="primary"
                    accessibilityHint={`Apply ${activeCount} active filters`}
                    style={styles.applyButton}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        maxHeight: 400,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
    },
    badge: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    clearButtonText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    scrollView: {
        maxHeight: 300,
    },
    filterGroup: {
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    groupLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
    },
    groupBadge: {
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginRight: 8,
    },
    groupBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
    },
    optionsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    optionSelected: {
        backgroundColor: '#F0F8FF',
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    optionLabel: {
        fontSize: 14,
        color: '#333333',
        marginLeft: 12,
        flex: 1,
    },
    optionLabelSelected: {
        color: '#007AFF',
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    applyButton: {
        width: '100%',
    },
});

