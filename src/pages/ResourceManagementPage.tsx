import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  NavigateNext as NavigateNextIcon,
  PersonOutline as PersonIcon,
  Build as BuildIcon,
  Handyman as ToolIcon,
  Domain as AreaIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import ContentWrapper from "../components/layout/ContentWrapper";
import {
  Resource,
  getResources,
  createResource,
  updateResource,
  deactivateResource,
  reactivateResource,
} from "../services/resourceService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`resource-tabpanel-${index}`}
      aria-labelledby={`resource-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const typeColors: Record<string, string> = {
  person: "#3f51b5",
  machine: "#f50057",
  tool: "#ff9800",
  area: "#4caf50",
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "person":
      return <PersonIcon />;
    case "machine":
      return <BuildIcon />;
    case "tool":
      return <ToolIcon />;
    case "area":
      return <AreaIcon />;
    default:
      return <PersonIcon />;
  }
};

const ResourceManagementPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<Partial<Resource>>({
    name: "",
    type: "person",
    department: "",
    email: "",
    capacity: 8,
    color: "#3f51b5",
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [tabValue, searchTerm, resources]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const allResources = await getResources(false);
      setResources(allResources);
      setError(null);
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError(`Failed to load resources: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    if (tabValue === 1) {
      filtered = filtered.filter(resource => resource.type === "person");
    } else if (tabValue === 2) {
      filtered = filtered.filter(resource => resource.type === "machine");
    } else if (tabValue === 3) {
      filtered = filtered.filter(resource => resource.type === "tool" || resource.type === "area");
    } else if (tabValue === 4) {
      filtered = filtered.filter(resource => !resource.active);
    } else {
      filtered = filtered.filter(resource => resource.active);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        resource =>
          resource.name.toLowerCase().includes(term) ||
          (resource.department && resource.department.toLowerCase().includes(term)) ||
          (resource.email && resource.email.toLowerCase().includes(term))
      );
    }

    setFilteredResources(filtered);
    setPage(0);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenFormDialog = (resource: Resource | null = null, viewOnly = false) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({ ...resource });
    } else {
      setEditingResource(null);
      setFormData({
        name: "",
        type: "person",
        department: "",
        email: "",
        capacity: 8,
        color: "#3f51b5",
        active: true,
      });
    }
    setIsViewMode(viewOnly);
    setFormErrors({});
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false);
  };

  const handleFormChange =
    (field: keyof Resource) =>
    (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
      const value = field === "capacity" ? Number(event.target.value) : event.target.value;
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      if (formErrors[field]) {
        setFormErrors(prev => ({
          ...prev,
          [field]: "",
        }));
      }
    };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name) {
      errors.name = "Name is required";
    }

    if (!formData.type) {
      errors.type = "Type is required";
    }

    if (formData.type === "person" && !formData.email) {
      errors.email = "Email is required for personnel";
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (formData.capacity !== undefined && (formData.capacity <= 0 || formData.capacity > 24)) {
      errors.capacity = "Capacity must be between 1 and 24 hours";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) {
      return;
    }

    setActionLoading(true);
    try {
      if (editingResource) {
        await updateResource(editingResource.id, formData);
        setSuccessMessage(`Resource "${formData.name}" updated successfully`);
      } else {
        await createResource(formData as Omit<Resource, "id" | "createdAt" | "updatedAt">);
        setSuccessMessage(`Resource "${formData.name}" created successfully`);
      }

      setIsFormDialogOpen(false);
      fetchResources();
    } catch (err) {
      console.error("Error saving resource:", err);
      setError(`Failed to save resource: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateResource = async (resource: Resource) => {
    if (window.confirm(`Are you sure you want to deactivate "${resource.name}"?`)) {
      setActionLoading(true);
      try {
        await deactivateResource(resource.id);
        setSuccessMessage(`Resource "${resource.name}" deactivated successfully`);
        fetchResources();
      } catch (err) {
        console.error("Error deactivating resource:", err);
        setError(
          `Failed to deactivate resource: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleReactivateResource = async (resource: Resource) => {
    setActionLoading(true);
    try {
      await reactivateResource(resource.id);
      setSuccessMessage(`Resource "${resource.name}" reactivated successfully`);
      fetchResources();
    } catch (err) {
      console.error("Error reactivating resource:", err);
      setError(
        `Failed to reactivate resource: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSuccessMessage = () => {
    setSuccessMessage(null);
  };

  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Resources</Typography>
          </Breadcrumbs>

          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}
          >
            <Typography variant="h4" component="h1">
              Resource Management
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchResources}
                disabled={loading}
                sx={{ mr: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenFormDialog()}
              >
                Add Resource
              </Button>
            </Box>
          </Box>
        </Box>

        {successMessage && (
          <Alert severity="success" onClose={handleCloseSuccessMessage} sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search resources..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: "action.active", mr: 1 }} />,
                }}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All Resources" />
            <Tab label="Personnel" />
            <Tab label="Machines" />
            <Tab label="Tools & Areas" />
            <Tab label="Inactive" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {renderResourceTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderResourceTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderResourceTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            {renderResourceTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            {renderResourceTable()}
          </TabPanel>
        </Paper>

        <Dialog open={isFormDialogOpen} onClose={handleCloseFormDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {isViewMode
              ? "Resource Details"
              : editingResource
                ? "Edit Resource"
                : "Add New Resource"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name || ""}
                  onChange={handleFormChange("name")}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  disabled={isViewMode}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  error={!!formErrors.type}
                  disabled={isViewMode || !!editingResource}
                >
                  <InputLabel id="resource-type-label">Type *</InputLabel>
                  <Select
                    labelId="resource-type-label"
                    value={formData.type || "person"}
                    onChange={handleFormChange("type") as any}
                    label="Type *"
                  >
                    <MenuItem value="person">Personnel</MenuItem>
                    <MenuItem value="machine">Machine</MenuItem>
                    <MenuItem value="tool">Tool</MenuItem>
                    <MenuItem value="area">Area</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department || ""}
                  onChange={handleFormChange("department")}
                  disabled={isViewMode}
                />
              </Grid>

              {(formData.type === "person" || !formData.type) && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleFormChange("email")}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    disabled={isViewMode}
                    required={formData.type === "person"}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Capacity (hours per day)"
                  type="number"
                  value={formData.capacity || ""}
                  onChange={handleFormChange("capacity")}
                  error={!!formErrors.capacity}
                  helperText={formErrors.capacity}
                  disabled={isViewMode}
                  InputProps={{ inputProps: { min: 1, max: 24 } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Color"
                  type="color"
                  value={formData.color || "#3f51b5"}
                  onChange={handleFormChange("color")}
                  disabled={isViewMode}
                  InputProps={{
                    startAdornment: (
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: formData.color || "#3f51b5",
                          mr: 1,
                        }}
                      />
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFormDialog}>{isViewMode ? "Close" : "Cancel"}</Button>
            {!isViewMode && (
              <Button
                onClick={handleSubmitForm}
                variant="contained"
                disabled={actionLoading}
                startIcon={actionLoading ? <CircularProgress size={20} /> : null}
              >
                {actionLoading ? "Saving..." : "Save"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </ContentWrapper>
  );

  function renderResourceTable() {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredResources.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No resources found. {searchTerm ? "Try a different search term or " : ""}
            <Button variant="text" startIcon={<AddIcon />} onClick={() => handleOpenFormDialog()}>
              add a new resource
            </Button>
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResources
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(resource => (
                  <TableRow key={resource.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: resource.color || typeColors[resource.type] || "#ccc",
                            mr: 1,
                          }}
                        />
                        {resource.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {getTypeIcon(resource.type)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{resource.department || "-"}</TableCell>
                    <TableCell>{resource.email || "-"}</TableCell>
                    <TableCell>{resource.capacity} hrs/day</TableCell>
                    <TableCell>
                      <Chip
                        label={resource.active ? "Active" : "Inactive"}
                        color={resource.active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenFormDialog(resource, true)}
                        >
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenFormDialog(resource)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {resource.active ? (
                        <Tooltip title="Deactivate">
                          <IconButton
                            size="small"
                            onClick={() => handleDeactivateResource(resource)}
                            color="error"
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivate">
                          <IconButton
                            size="small"
                            onClick={() => handleReactivateResource(resource)}
                            color="success"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredResources.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  }
};

export default ResourceManagementPage;
