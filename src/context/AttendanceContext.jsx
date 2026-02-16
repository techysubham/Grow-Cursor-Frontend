import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAttendanceStatus, startTimer, pauseTimer, resumeTimer, stopTimer } from '../lib/api';

const AttendanceContext = createContext();

export function useAttendance() {
    const context = useContext(AttendanceContext);
    if (!context) {
        throw new Error('useAttendance must be used within AttendanceProvider');
    }
    return context;
}

export function AttendanceProvider({ children, user }) {
    const [status, setStatus] = useState('loading'); // 'loading', 'not_started', 'active', 'paused', 'completed'
    const [attendance, setAttendance] = useState(null);
    const [isStrictTimer, setIsStrictTimer] = useState(false);
    const [totalHours, setTotalHours] = useState('0.00');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch initial status
    const fetchStatus = useCallback(async () => {
        if (!user) {
            setStatus('not_started');
            return;
        }

        try {
            const response = await getAttendanceStatus();
            setStatus(response.status || 'not_started');
            setAttendance(response.attendance);
            setIsStrictTimer(response.isStrictTimer);
            setTotalHours(response.totalHours || '0.00');
        } catch (error) {
            console.error('Failed to fetch attendance status:', error);
            setStatus('not_started');
        }
    }, [user]);

    useEffect(() => {
        fetchStatus();

        // Refresh status every 30 seconds to keep timer updated
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const start = async () => {
        setIsLoading(true);
        try {
            const response = await startTimer();
            setStatus('active');
            setAttendance(response.attendance);
            await fetchStatus(); // Refresh to get latest
        } catch (error) {
            console.error('Failed to start timer:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const pause = async () => {
        setIsLoading(true);
        try {
            const response = await pauseTimer();
            setStatus('paused');
            setAttendance(response.attendance);
            await fetchStatus();
        } catch (error) {
            console.error('Failed to pause timer:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const resume = async () => {
        setIsLoading(true);
        try {
            const response = await resumeTimer();
            setStatus('active');
            setAttendance(response.attendance);
            await fetchStatus();
        } catch (error) {
            console.error('Failed to resume timer:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const stop = async () => {
        setIsLoading(true);
        try {
            const response = await stopTimer();
            setStatus('completed');
            setAttendance(response.attendance);
            setTotalHours(response.totalHours || '0.00');
            await fetchStatus();
        } catch (error) {
            console.error('Failed to stop timer:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        status,
        attendance,
        isStrictTimer,
        totalHours,
        isLoading,
        start,
        pause,
        resume,
        stop,
        refresh: fetchStatus
    };

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    );
}
