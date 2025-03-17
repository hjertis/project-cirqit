// src/components/orders/OrderPlanningGantt.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Extend dayjs with plugins
dayjs.extend(isBetween);

// Define types for orders and processes
interface Order {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  status: string;
  start: Timestamp;
  end: Timestamp;
  priority: string;
  customer?: string;
}

interface Process {
  id: string;
  workOrderId: string;
  type: string;
  name: string;
  sequence: number;
  status: string;
  startDate: Timestamp;
  endDate: Timestamp;
  assignedResource: string | null;
  progress: number;
}

// Group processes by order
interface OrderWithProcesses {
  order: Order;
  processes: Process[];
}

// Types for the Gantt chart
interface GanttBar {
  id: string;
  text: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'order' | 'process';
  status: string;
  resourceName?: string;
  parentId?: string; // For processes to link to parent orders
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Open':
    case 'Released':
    case 'Pending':
      return '#3f51b5'; // primary
    case 'In Progress':
      return '#19857b'; // secondary
    case 'Done':
    case 'Finished':
    case 'Completed':
      return '#4caf50'; // success
    case 'Delayed':
    case 'Not Started':
      return '#f44336'; // error
    default:
      return '#9e9e9e'; // default
  }
};

const formatDate = (date: Date): string => {
  return dayjs(date).format('MMM D, YYYY');
};

// Timeline configuration
const DAY_WIDTH_DEFAULT = 40; // pixels per day
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 50;
const TODAY = new Date();

const OrderPlanningGantt: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersWithProcesses, setOrdersWithProcesses] = useState<OrderWithProcesses[]>([]);
  const [ganttBars, setGanttBars] = useState<GanttBar[]>([]);
  
  // Gantt view state
  const [startDate, setStartDate] = useState<Date>(dayjs().subtract(7, 'day').toDate());
  const [endDate, setEndDate] = useState<Date>(dayjs().add(30, 'day').toDate());
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH_DEFAULT);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterResource, setFilterResource] = useState<string>('');
  const [resources, setResources] = useState<string[]>([]);
  
  // Number of days to display
  const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day');
  
  // Calculate total width of the chart
  const chartWidth = daysDiff * dayWidth;
  
  // Generate dates for the header
  const dates = Array.from({ length: daysDiff }, (_, i) => 
    dayjs(startDate).add(i, 'day').toDate()
  );

  // Fetch orders and processes
  useEffect(() => {
    const fetchOrdersAndProcesses = async () => {
      setLoading(true);
      try {
        // Fetch all orders
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        const ordersData: Order[] = [];
        ordersSnapshot.forEach(doc => {
          ordersData.push({
            id: doc.id,
            ...doc.data(),
          } as Order);
        });
        
        // Fetch all processes
        const processesQuery = query(collection(db, 'processes'));
        const processesSnapshot = await getDocs(processesQuery);
        
        const processesData: Process[] = [];
        const resourceSet = new Set<string>();
        
        processesSnapshot.forEach(doc => {
          const process = {
            id: doc.id,
            ...doc.data(),
          } as Process;
          
          processesData.push(process);
          
          // Collect unique resources
          if (process.assignedResource) {
            resourceSet.add(process.assignedResource);
          }
        });
        
        // Group processes by order
        const groupedData: OrderWithProcesses[] = ordersData.map(order => {
          const orderProcesses = processesData
            .filter(process => process.workOrderId === order.id)
            .sort((a, b) => a.sequence - b.sequence);
            
          return {
            order,
            processes: orderProcesses,
          };
        });
        
        setOrdersWithProcesses(groupedData);
        setResources(Array.from(resourceSet).sort());
        
        // Create gantt bars
        const bars: GanttBar[] = [];
        
        groupedData.forEach(({ order, processes }) => {
          // Add order bar
          bars.push({
            id: `order-${order.id}`,
            text: `${order.orderNumber}: ${order.description}`,
            start: order.start.toDate(),
            end: order.end.toDate(),
            progress: 0, // Calculate based on process progress
            type: 'order',
            status: order.status,
          });
          
          // Set earliest start and latest end date to adjust view
          const orderStart = order.start.toDate();
          const orderEnd = order.end.toDate();
          
          // Calculate order progress based on processes
          let totalProgress = 0;
          
          // Add process bars
          processes.forEach(process => {
            const processStart = process.startDate.toDate();
            const processEnd = process.endDate.toDate();
            
            bars.push({
              id: `process-${process.id}`,
              text: `${process.name}`,
              start: processStart,
              end: processEnd,
              progress: process.progress,
              type: 'process',
              status: process.status,
              resourceName: process.assignedResource || undefined,
              parentId: `order-${order.id}`,
            });
            
            totalProgress += process.progress;
          });
          
          // Update order progress
          if (processes.length > 0) {
            const orderBar = bars.find(bar => bar.id === `order-${order.id}`);
            if (orderBar) {
              orderBar.progress = Math.round(totalProgress / processes.length);
            }
          }
          
          // Update chart date range if needed to show all orders
          if (dayjs(orderStart).isBefore(dayjs(startDate))) {
            setStartDate(orderStart);
          }
          if (dayjs(orderEnd).isAfter(dayjs(endDate))) {
            setEndDate(orderEnd);
          }
        });
        
        setGanttBars(bars);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders and processes:', err);
        setError(`Failed to load planning data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrdersAndProcesses();
  }, []);
  
  // Filter gantt bars based on status and resource
  const filteredBars = ganttBars.filter(bar => {
    // Status filter
    if (filterStatus && bar.status !== filterStatus) {
      // Keep parent orders of filtered processes
      const hasMatchingChild = bar.type === 'order' && 
        ganttBars.some(childBar => 
          childBar.parentId === bar.id && childBar.status === filterStatus
        );
      
      if (!hasMatchingChild) {
        return false;
      }
    }
    
    // Resource filter
    if (filterResource && bar.type === 'process') {
      if (bar.resourceName !== filterResource) {
        return false;
      }
    } else if (filterResource && bar.type === 'order') {
      // Keep orders that have processes with the filtered resource
      const hasMatchingResource = ganttBars.some(childBar => 
        childBar.parentId === bar.id && childBar.resourceName === filterResource
      );
      
      if (!hasMatchingResource) {
        return false;
      }
    }
    
    return true;
  });
  
  // Group bars by orders and their processes
  interface BarGroup {
    order: GanttBar;
    processes: GanttBar[];
  }
  
  // Group the filtered bars
  const barGroups: BarGroup[] = [];
  const orderBars = filteredBars.filter(bar => bar.type === 'order');
  
  orderBars.forEach(orderBar => {
    const processes = filteredBars.filter(bar => 
      bar.type === 'process' && bar.parentId === orderBar.id
    );
    
    barGroups.push({
      order: orderBar,
      processes,
    });
  });
  
  // Zoom in/out handlers
  const handleZoomIn = () => {
    setDayWidth(prev => Math.min(prev + 10, 100));
  };
  
  const handleZoomOut = () => {
    setDayWidth(prev => Math.max(prev - 10, 20));
  };
  
  // Go to today
  const handleGoToToday = () => {
    const today = new Date();
    const newStartDate = dayjs(today).subtract(7, 'day').toDate();
    const newEndDate = dayjs(today).add(21, 'day').toDate();
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setFilterStatus('');
    setFilterResource('');
  };
  
  // Get position on the timeline
  const getBarPosition = (date: Date): number => {
    const dateObj = dayjs(date);
    const timelineStart = dayjs(startDate);
    const diffDays = dateObj.diff(timelineStart, 'day', true);
    return Math.max(0, diffDays * dayWidth);
  };
  
  // Get width of a bar
  const getBarWidth = (start: Date, end: Date): number => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const durationDays = endDate.diff(startDate, 'day', true);
    return Math.max(0, durationDays * dayWidth);
  };
  
  // Get status options from all bars
  const statusOptions = [...new Set(ganttBars.map(bar => bar.status))].sort();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Paper sx={{ p: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Order Planning Timeline</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Zoom In">
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Go to Today">
            <IconButton onClick={handleGoToToday} size="small">
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statusOptions.map(status => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="resource-filter-label">Resource</InputLabel>
          <Select
            labelId="resource-filter-label"
            id="resource-filter"
            value={filterResource}
            label="Resource"
            onChange={(e) => setFilterResource(e.target.value)}
          >
            <MenuItem value="">All Resources</MenuItem>
            {resources.map(resource => (
              <MenuItem key={resource} value={resource}>
                {resource}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {(filterStatus || filterResource) && (
          <Tooltip title="Reset Filters">
            <IconButton onClick={handleResetFilters} size="small">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Typography variant="body2" color="text.secondary">
          Showing {barGroups.length} orders with {filteredBars.length - barGroups.length} processes
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', mb: 2 }}>
        {/* Timeline header with dates */}
        <Box sx={{ width: 300, flexShrink: 0 }}>
          <Box sx={{ height: HEADER_HEIGHT, display: 'flex', alignItems: 'center', pl: 2 }}>
            <Typography variant="body2" fontWeight="bold">Order / Process</Typography>
          </Box>
        </Box>
        
        <Box sx={{ overflow: 'auto', position: 'relative' }}>
          <Box sx={{ minWidth: chartWidth, height: HEADER_HEIGHT, display: 'flex' }}>
            {dates.map((date, index) => {
              const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6;
              const isToday = dayjs(date).isSame(dayjs(), 'day');
              
              return (
                <Box
                  key={index}
                  sx={{
                    width: dayWidth,
                    height: '100%',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: isWeekend ? 'action.hover' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  {isToday && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        backgroundColor: 'error.main',
                        left: 'calc(50% - 1px)',
                      }}
                    />
                  )}
                  <Typography variant="caption" color={isToday ? 'error' : 'text.secondary'}>
                    {dayjs(date).format('D')}
                  </Typography>
                  <Typography variant="caption" color={isToday ? 'error' : 'text.secondary'}>
                    {dayjs(date).format('MMM')}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', position: 'relative', height: `${barGroups.length * (ROW_HEIGHT * 2 + 10)}px` }}>
        {/* Order and process names */}
        <Box sx={{ width: 300, flexShrink: 0 }}>
          {barGroups.map((group, groupIndex) => (
            <Box key={group.order.id} sx={{ mb: 1 }}>
              {/* Order name */}
              <Box
                sx={{
                  height: ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  pl: 2,
                  pr: 1,
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" noWrap title={group.order.text} fontWeight="bold">
                  {group.order.text}
                </Typography>
              </Box>
              
              {/* Process names */}
              <Box sx={{ pl: 4 }}>
                {group.processes.map(process => (
                  <Box
                    key={process.id}
                    sx={{
                      height: ROW_HEIGHT,
                      display: 'flex',
                      alignItems: 'center',
                      pl: 2,
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" noWrap title={process.text}>
                      {process.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        
        {/* Gantt chart */}
        <Box sx={{ overflow: 'auto', position: 'relative', flexGrow: 1 }}>
          <Box sx={{ minWidth: chartWidth, position: 'relative' }}>
            {/* Background grid */}
            <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
              {dates.map((date, index) => {
                const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6;
                const isToday = dayjs(date).isSame(dayjs(), 'day');
                
                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: dayWidth,
                      left: index * dayWidth,
                      backgroundColor: isWeekend ? 'action.hover' : 'transparent',
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {isToday && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          backgroundColor: 'error.main',
                          left: 'calc(50% - 1px)',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
            
            {/* Gantt bars */}
            {barGroups.map((group, groupIndex) => {
              let currentTop = groupIndex * (ROW_HEIGHT * 2 + 10);
              
              return (
                <Box key={group.order.id}>
                  {/* Order bar */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: currentTop,
                      left: getBarPosition(group.order.start),
                      width: getBarWidth(group.order.start, group.order.end),
                      height: ROW_HEIGHT,
                      backgroundColor: getStatusColor(group.order.status),
                      opacity: 0.8,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 1,
                        boxShadow: 2,
                      },
                    }}
                    title={`${group.order.text} (${formatDate(group.order.start)} - ${formatDate(group.order.end)})`}
                  >
                    {/* Progress bar */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${group.order.progress}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: 1,
                      }}
                    />
                    
                    <Typography variant="caption" sx={{ zIndex: 1 }}>
                      {group.order.progress}%
                    </Typography>
                  </Box>
                  
                  {/* Process bars */}
                  {group.processes.map((process, processIndex) => {
                    const top = currentTop + ROW_HEIGHT + 5 + processIndex * ROW_HEIGHT;
                    
                    return (
                      <Box
                        key={process.id}
                        sx={{
                          position: 'absolute',
                          top,
                          left: getBarPosition(process.start),
                          width: getBarWidth(process.start, process.end),
                          height: ROW_HEIGHT - 10,
                          backgroundColor: getStatusColor(process.status),
                          opacity: 0.7,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: 'white',
                          px: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 1,
                            boxShadow: 1,
                          },
                        }}
                        title={`${process.text} (${formatDate(process.start)} - ${formatDate(process.end)})`}
                      >
                        {/* Progress bar */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${process.progress}%`,
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: 1,
                          }}
                        />
                        
                        <Typography variant="caption" sx={{ zIndex: 1 }}>
                          {process.progress}%
                        </Typography>
                        
                        {process.resourceName && (
                          <Chip
                            label={process.resourceName}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              zIndex: 1,
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default OrderPlanningGantt;