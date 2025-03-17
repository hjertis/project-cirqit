// src/components/orders/OrderWorkflowTimeline.tsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  useTheme
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Extend dayjs
dayjs.extend(isBetween);

// Define interfaces
interface Order {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  status: string;
  start: Timestamp;
  end: Timestamp;
  priority?: string;
  customer?: string;
  quantity: number;
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

interface OrderWithProcesses {
  order: Order;
  processes: Process[];
}

// Define the workflow stages
interface WorkflowStage {
  id: string;
  name: string;
  color: string;
  processTypes: string[];
}

// Define workflow stages
const workflowStages: WorkflowStage[] = [
  {
    id: 'testing',
    name: 'Testing',
    color: '#e74c3c', // Red
    processTypes: ['Setup', 'Testing']
  },
  {
    id: 'preparation',
    name: 'Preparation',
    color: '#3498db', // Blue
    processTypes: ['Preparation', 'Setup']
  },
  {
    id: 'processing',
    name: 'Processing',
    color: '#f1c40f', // Yellow
    processTypes: ['Assembly', 'Production']
  },
  {
    id: 'finalize',
    name: 'Finalize',
    color: '#9b59b6', // Purple
    processTypes: ['Quality Check', 'Packaging', 'Shipping']
  }
];

// Define the resource groups
const resourceGroups = [
  { id: 'tech1', name: 'Tech 1', resources: ['John Doe', 'Jane Smith'] },
  { id: 'tech2', name: 'Tech 2', resources: ['Mike Johnson', 'Sarah Williams'] },
  { id: 'elec1', name: 'Elec 1', resources: ['Robert Brown', 'Emma Davis'] }
];

// Get stage for a process type
const getStageForProcessType = (processType: string): WorkflowStage | undefined => {
  return workflowStages.find(stage => 
    stage.processTypes.includes(processType)
  );
};

// Get resource group for a resource
const getResourceGroupForResource = (resourceName: string | null): string => {
  if (!resourceName) return '';
  
  const group = resourceGroups.find(group => 
    group.resources.includes(resourceName)
  );
  
  return group ? group.name : '';
};

// Determine stage progress
const determineStageProgress = (processes: Process[], stageProcessTypes: string[]): number => {
  const stageProcesses = processes.filter(p => 
    stageProcessTypes.includes(p.type)
  );
  
  if (stageProcesses.length === 0) return 0;
  
  const totalProgress = stageProcesses.reduce((sum, process) => sum + process.progress, 0);
  return Math.round(totalProgress / stageProcesses.length);
};

// Determine if a stage is active
const isStageActive = (processes: Process[], stageProcessTypes: string[]): boolean => {
  return processes.some(p => 
    stageProcessTypes.includes(p.type) && 
    (p.status === 'In Progress' || p.status === 'Pending')
  );
};

// Determine if a stage is completed
const isStageCompleted = (processes: Process[], stageProcessTypes: string[]): boolean => {
  const stageProcesses = processes.filter(p => 
    stageProcessTypes.includes(p.type)
  );
  
  if (stageProcesses.length === 0) return false;
  
  return stageProcesses.every(p => p.status === 'Completed' || p.status === 'Finished' || p.status === 'Done');
};

// Format date
const formatDate = (date: Date): string => {
  return dayjs(date).format('DD/MM/YYYY');
};

// Format friendly due date
const formatDueDate = (date: Date): string => {
  const now = dayjs();
  const dueDate = dayjs(date);
  const diffDays = dueDate.diff(now, 'day');
  
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} days`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays < 7) {
    return `Due in ${diffDays} days`;
  } else if (diffDays < 30) {
    return `Due in ${Math.floor(diffDays / 7)} weeks`;
  } else {
    return `Due ${formatDate(date)}`;
  }
};

// Get priority color
const getPriorityColor = (priority: string = 'Medium'): string => {
  switch (priority) {
    case 'Critical':
      return '#e74c3c';
    case 'High':
      return '#e67e22';
    case 'Medium-High':
      return '#f39c12';
    case 'Medium':
      return '#3498db';
    case 'Low':
      return '#2ecc71';
    default:
      return '#3498db';
  }
};

// Get status color
const getStatusColor = (status: string): string => {
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

const OrderWorkflowTimeline: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersWithProcesses, setOrdersWithProcesses] = useState<OrderWithProcesses[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithProcesses[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Released');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Fetch orders and their processes
  useEffect(() => {
    const fetchOrdersAndProcesses = async () => {
      setLoading(true);
      try {
        // Create a query to fetch orders
        const ordersQuery = filterStatus 
          ? query(
              collection(db, 'orders'),
              where('status', '==', filterStatus),
              orderBy('end', 'asc'),
              limit(20)
            )
          : query(
              collection(db, 'orders'),
              orderBy('end', 'asc'),
              limit(20)
            );
        
        // Fetch orders
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData: Order[] = [];
        
        ordersSnapshot.forEach(doc => {
          ordersData.push({
            id: doc.id,
            ...doc.data()
          } as Order);
        });
        
        // Fetch processes for these orders
        const orderProcesses: Record<string, Process[]> = {};
        
        for (const order of ordersData) {
          const processesQuery = query(
            collection(db, 'processes'),
            where('workOrderId', '==', order.id)
          );
          
          const processesSnapshot = await getDocs(processesQuery);
          const processes: Process[] = [];
          
          processesSnapshot.forEach(doc => {
            processes.push({
              id: doc.id,
              ...doc.data()
            } as Process);
          });
          
          // Sort processes by sequence
          processes.sort((a, b) => a.sequence - b.sequence);
          orderProcesses[order.id] = processes;
        }
        
        // Combine orders with their processes
        const ordersWithProcessesData = ordersData.map(order => ({
          order,
          processes: orderProcesses[order.id] || []
        }));
        
        setOrdersWithProcesses(ordersWithProcessesData);
        setFilteredOrders(ordersWithProcessesData);
        setError(null);
        
        // Initialize expanded state
        const newExpanded: Record<string, boolean> = {};
        ordersData.forEach(order => {
          newExpanded[order.id] = false;
        });
        setExpanded(newExpanded);
      } catch (err) {
        console.error('Error fetching orders and processes:', err);
        setError(`Failed to load orders: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrdersAndProcesses();
  }, [filterStatus]);
  
  // Handle filter change
  const handleFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFilterStatus(event.target.value as string);
  };
  
  // Toggle expanded state for an order
  const toggleExpanded = (orderId: string) => {
    setExpanded(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };
  
  // Handle view order details
  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };
  
  // Handle edit order
  const handleEditOrder = (orderId: string) => {
    navigate(`/orders/${orderId}/edit`);
  };
  
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
  
  if (filteredOrders.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          No orders found matching the selected filter.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Filter controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Order Workflow Timeline</Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={filterStatus}
            label="Status"
            onChange={handleFilterChange}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Released">Released</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Delayed">Delayed</MenuItem>
            <MenuItem value="Finished">Finished</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Workflow stage header */}
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Box sx={{ width: '300px', flexShrink: 0 }}>
          <Typography variant="subtitle2" color="text.secondary">Order Details</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          {workflowStages.map(stage => (
            <Box 
              key={stage.id}
              sx={{ 
                flexGrow: 1, 
                bgcolor: stage.color,
                color: 'white',
                p: 1,
                textAlign: 'center',
                borderRadius: '4px 4px 0 0'
              }}
            >
              <Typography variant="subtitle2">{stage.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Orders with workflow stages */}
      <Box sx={{ mb: 3 }}>
        {filteredOrders.map(({ order, processes }) => (
          <Paper 
            key={order.id} 
            sx={{ 
              mb: 2, 
              overflow: 'hidden',
              borderLeft: '4px solid',
              borderColor: getPriorityColor(order.priority),
            }}
            elevation={2}
          >
            {/* Order summary row */}
            <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Order details */}
              <Box 
                sx={{ 
                  width: '300px', 
                  p: 2, 
                  flexShrink: 0,
                  borderRight: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="subtitle1" 
                    noWrap
                    title={order.orderNumber}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {order.orderNumber}
                  </Typography>
                  
                  <Chip 
                    label={order.status} 
                    size="small"
                    sx={{ 
                      bgcolor: getStatusColor(order.status),
                      color: 'white'
                    }}
                  />
                </Box>
                
                <Typography 
                  variant="body2" 
                  noWrap 
                  title={order.description}
                  sx={{ mb: 1 }}
                >
                  {order.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <ScheduleIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Due: {formatDate(order.end.toDate())}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FlagIcon 
                    fontSize="small" 
                    sx={{ 
                      mr: 0.5, 
                      color: getPriorityColor(order.priority)
                    }} 
                  />
                  <Typography variant="caption" color="text.secondary">
                    {order.priority || 'Medium'} Priority
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Edit Order">
                    <IconButton 
                      size="small"
                      onClick={() => handleEditOrder(order.id)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title={expanded[order.id] ? "Hide Details" : "Show Details"}>
                    <IconButton 
                      size="small"
                      onClick={() => toggleExpanded(order.id)}
                      sx={{ 
                        ml: 'auto',
                        transform: expanded[order.id] ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.3s'
                      }}
                    >
                      <ArrowDropDownIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              {/* Workflow stages progress */}
              <Box sx={{ display: 'flex', flexGrow: 1 }}>
                {workflowStages.map(stage => {
                  const progress = determineStageProgress(processes, stage.processTypes);
                  const isActive = isStageActive(processes, stage.processTypes);
                  const isComplete = isStageCompleted(processes, stage.processTypes);
                  
                  // Find processes for this stage
                  const stageProcesses = processes.filter(p => 
                    stage.processTypes.includes(p.type)
                  );
                  
                  // Find resource assigned to this stage
                  const resourcesForStage = stageProcesses
                    .map(p => p.assignedResource)
                    .filter(r => r !== null) as string[];
                    
                  const uniqueResources = [...new Set(resourcesForStage)];
                  
                  return (
                    <Box 
                      key={stage.id}
                      sx={{ 
                        flexGrow: 1,
                        p: 2,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: isActive ? `${stage.color}10` : 'transparent',
                      }}
                    >
                      {isComplete ? (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0,
                          backgroundColor: `${stage.color}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="h6" sx={{ 
                            color: stage.color,
                            fontWeight: 'bold'
                          }}>
                            COMPLETE
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          {/* Progress bar */}
                          <Box sx={{ 
                            height: 4, 
                            width: '100%',
                            backgroundColor: 'background.default',
                            borderRadius: 1,
                            mb: 1
                          }}>
                            <Box sx={{ 
                              height: '100%',
                              width: `${progress}%`,
                              backgroundColor: stage.color,
                              borderRadius: 1
                            }} />
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {progress}%
                            </Typography>
                            
                            {uniqueResources.length > 0 && (
                              <Tooltip title={`Assigned to: ${uniqueResources.join(', ')}`}>
                                <Chip
                                  icon={<PersonIcon />}
                                  label={uniqueResources.length > 1 ? `${uniqueResources.length} resources` : uniqueResources[0]}
                                  size="small"
                                  sx={{ height: 24 }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
            
            {/* Expanded process details */}
            {expanded[order.id] && (
              <Box sx={{ 
                p: 2, 
                borderTop: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'background.default'
              }}>
                <Typography variant="subtitle2" gutterBottom>Process Details</Typography>
                
                {processes.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {processes.map((process) => {
                      const stage = getStageForProcessType(process.type);
                      
                      return (
                        <Box 
                          key={process.id} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper'
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: 4, 
                              height: 36,
                              borderRadius: 2,
                              bgcolor: stage ? stage.color : 'grey.500',
                              mr: 2
                            }} 
                          />
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {process.sequence}. {process.name} ({process.type})
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(process.startDate.toDate())} - {formatDate(process.endDate.toDate())}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {process.assignedResource && (
                              <Chip
                                icon={<PersonIcon fontSize="small" />}
                                label={process.assignedResource}
                                size="small"
                                sx={{ height: 24 }}
                              />
                            )}
                            
                            <Chip
                              label={process.status}
                              size="small"
                              sx={{ 
                                bgcolor: getStatusColor(process.status),
                                color: 'white',
                                height: 24
                              }}
                            />
                            
                            <Typography variant="body2" fontWeight="medium" sx={{ ml: 1, minWidth: 40, textAlign: 'right' }}>
                              {process.progress}%
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No processes found for this order.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default OrderWorkflowTimeline;